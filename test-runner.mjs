#!/usr/bin/env node

/**
 * test-runner.mjs - 全面的应用测试运行器
 * 用于验证重构后应用的所有功能和安全性
 */

import { promises as fs } from 'fs'
import { spawn } from 'child_process'
import path from 'path'

// 测试配置
const TEST_CONFIG = {
  BUILD_TIMEOUT: 60000,    // 1分钟构建超时
  SERVER_TIMEOUT: 10000,   // 10秒服务器启动超时
  TEST_TIMEOUT: 30000,     // 30秒测试超时
  PREVIEW_PORT: 4173,
  NETWORK_TESTS: true,
  SECURITY_TESTS: true,
  PERFORMANCE_TESTS: true
}

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 执行Shell命令
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      stdio: 'pipe',
      ...options
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code })
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`))
      }
    })

    // 超时处理
    if (options.timeout) {
      setTimeout(() => {
        child.kill('SIGTERM')
        reject(new Error(`Command timed out after ${options.timeout}ms`))
      }, options.timeout)
    }
  })
}

// 检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// 1. 代码质量检查
async function runCodeQualityTests() {
  log('\n🔍 代码质量检查...', 'blue')
  
  const tests = []

  // 检查文件结构
  const requiredFiles = [
    'src/SecureApp.jsx',
    'src/components/ErrorBoundary.jsx',
    'src/hooks/usePerformanceMonitor.js',
    'src/utils/testUtils.js',
    '.env',
    'package.json'
  ]

  for (const file of requiredFiles) {
    const exists = await fileExists(file)
    tests.push({
      name: `文件存在: ${file}`,
      passed: exists,
      error: exists ? null : `文件 ${file} 不存在`
    })
  }

  // 检查代码复杂性
  const sourceFiles = [
    'src/SecureApp.jsx',
    'src/components/ErrorBoundary.jsx',
    'src/hooks/usePerformanceMonitor.js'
  ]

  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8')
      const lines = content.split('\n').length
      const functions = (content.match(/function\s+\w+|const\s+\w+\s*=/g) || []).length
      
      tests.push({
        name: `代码复杂度: ${file}`,
        passed: lines < 2000 && functions < 50,
        details: `${lines} 行, ${functions} 函数`,
        error: lines >= 2000 ? '文件过大' : functions >= 50 ? '函数过多' : null
      })
    } catch (error) {
      tests.push({
        name: `代码分析: ${file}`,
        passed: false,
        error: error.message
      })
    }
  }

  return {
    category: '代码质量',
    tests,
    passed: tests.every(t => t.passed),
    summary: `${tests.filter(t => t.passed).length}/${tests.length} 测试通过`
  }
}

// 2. 构建测试
async function runBuildTests() {
  log('\n🏗️ 构建测试...', 'blue')
  
  const tests = []

  try {
    // 清理之前的构建
    await execCommand('rm -rf dist', { timeout: 5000 })
    
    // 执行构建
    log('执行构建命令...', 'cyan')
    const buildResult = await execCommand('npm run build', { 
      timeout: TEST_CONFIG.BUILD_TIMEOUT 
    })
    
    tests.push({
      name: '构建执行',
      passed: buildResult.code === 0,
      error: buildResult.code !== 0 ? buildResult.stderr : null
    })

    // 检查构建产物
    const buildFiles = [
      'dist/index.html',
      'dist/assets'
    ]

    for (const file of buildFiles) {
      const exists = await fileExists(file)
      tests.push({
        name: `构建产物: ${file}`,
        passed: exists,
        error: exists ? null : `构建产物 ${file} 缺失`
      })
    }

    // 检查文件大小
    try {
      const stats = await fs.stat('dist')
      tests.push({
        name: '构建产物大小',
        passed: true,
        details: `构建目录大小: ${(stats.size / 1024).toFixed(2)} KB`
      })
    } catch (error) {
      tests.push({
        name: '构建产物大小',
        passed: false,
        error: error.message
      })
    }

  } catch (error) {
    tests.push({
      name: '构建执行',
      passed: false,
      error: error.message
    })
  }

  return {
    category: '构建测试',
    tests,
    passed: tests.every(t => t.passed),
    summary: `${tests.filter(t => t.passed).length}/${tests.length} 测试通过`
  }
}

// 3. 依赖检查
async function runDependencyTests() {
  log('\n📦 依赖检查...', 'blue')
  
  const tests = []

  try {
    // 检查 package.json
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))
    
    tests.push({
      name: 'package.json 解析',
      passed: true,
      details: `${Object.keys(packageJson.dependencies || {}).length} 依赖项`
    })

    // 检查关键依赖
    const requiredDeps = ['react', 'ethers']
    for (const dep of requiredDeps) {
      const hasDep = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
      tests.push({
        name: `依赖项: ${dep}`,
        passed: !!hasDep,
        details: hasDep ? `版本: ${hasDep}` : undefined,
        error: hasDep ? null : `缺少依赖 ${dep}`
      })
    }

    // 检查 node_modules
    const nodeModulesExists = await fileExists('node_modules')
    tests.push({
      name: 'node_modules 目录',
      passed: nodeModulesExists,
      error: nodeModulesExists ? null : 'node_modules 目录不存在，请运行 npm install'
    })

  } catch (error) {
    tests.push({
      name: 'package.json 解析',
      passed: false,
      error: error.message
    })
  }

  return {
    category: '依赖检查',
    tests,
    passed: tests.every(t => t.passed),
    summary: `${tests.filter(t => t.passed).length}/${tests.length} 测试通过`
  }
}

// 4. 环境配置检查
async function runEnvironmentTests() {
  log('\n⚙️ 环境配置检查...', 'blue')
  
  const tests = []

  try {
    // 检查 .env 文件
    const envExists = await fileExists('.env')
    tests.push({
      name: '.env 文件存在',
      passed: envExists,
      error: envExists ? null : '.env 文件不存在'
    })

    if (envExists) {
      const envContent = await fs.readFile('.env', 'utf-8')
      const envVars = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
      
      tests.push({
        name: '.env 文件内容',
        passed: envVars.length > 0,
        details: `${envVars.length} 个环境变量`,
        error: envVars.length === 0 ? '.env 文件为空' : null
      })

      // 检查关键环境变量
      const requiredVars = ['VITE_CONTRACT_ADDRESS', 'VITE_RPC_URL']
      for (const varName of requiredVars) {
        const hasVar = envContent.includes(varName)
        tests.push({
          name: `环境变量: ${varName}`,
          passed: hasVar,
          error: hasVar ? null : `缺少环境变量 ${varName}`
        })
      }
    }

  } catch (error) {
    tests.push({
      name: '环境配置读取',
      passed: false,
      error: error.message
    })
  }

  return {
    category: '环境配置',
    tests,
    passed: tests.every(t => t.passed),
    summary: `${tests.filter(t => t.passed).length}/${tests.length} 测试通过`
  }
}

// 5. 安全检查
async function runSecurityTests() {
  log('\n🔒 安全检查...', 'blue')
  
  const tests = []

  try {
    // 检查敏感信息泄露
    const sourceFiles = [
      'src/SecureApp.jsx',
      'src/components/ErrorBoundary.jsx',
      'src/hooks/usePerformanceMonitor.js'
    ]

    const sensitivePatterns = [
      /private.*key/i,
      /secret/i,
      /password/i,
      /api.*key/i,
      /0x[a-fA-F0-9]{64}/g // 私钥模式
    ]

    for (const file of sourceFiles) {
      if (await fileExists(file)) {
        const content = await fs.readFile(file, 'utf-8')
        const foundSensitive = sensitivePatterns.some(pattern => pattern.test(content))
        
        tests.push({
          name: `敏感信息检查: ${file}`,
          passed: !foundSensitive,
          error: foundSensitive ? '发现潜在敏感信息' : null
        })
      }
    }

    // 检查 HTML 注入防护
    const mainFiles = ['src/SecureApp.jsx']
    for (const file of mainFiles) {
      if (await fileExists(file)) {
        const content = await fs.readFile(file, 'utf-8')
        const hasProperEscaping = content.includes('sanitizeText') || content.includes('DOMPurify')
        
        tests.push({
          name: `HTML注入防护: ${file}`,
          passed: hasProperEscaping,
          error: hasProperEscaping ? null : '缺少HTML注入防护'
        })
      }
    }

    // 检查错误边界
    const hasErrorBoundary = await fileExists('src/components/ErrorBoundary.jsx')
    tests.push({
      name: 'React错误边界',
      passed: hasErrorBoundary,
      error: hasErrorBoundary ? null : '缺少错误边界组件'
    })

  } catch (error) {
    tests.push({
      name: '安全检查执行',
      passed: false,
      error: error.message
    })
  }

  return {
    category: '安全检查',
    tests,
    passed: tests.every(t => t.passed),
    summary: `${tests.filter(t => t.passed).length}/${tests.length} 测试通过`
  }
}

// 生成测试报告
function generateReport(results) {
  log('\n📊 测试报告', 'magenta')
  log('='.repeat(60), 'magenta')

  let totalTests = 0
  let totalPassed = 0

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌'
    log(`\n${icon} ${result.category} - ${result.summary}`, result.passed ? 'green' : 'red')
    
    for (const test of result.tests) {
      const testIcon = test.passed ? '  ✓' : '  ✗'
      const testColor = test.passed ? 'green' : 'red'
      
      let testLine = `${testIcon} ${test.name}`
      if (test.details) testLine += ` (${test.details})`
      
      log(testLine, testColor)
      
      if (test.error) {
        log(`    ↳ ${test.error}`, 'yellow')
      }
    }

    totalTests += result.tests.length
    totalPassed += result.tests.filter(t => t.passed).length
  }

  log('\n' + '='.repeat(60), 'magenta')
  log(`总计: ${totalPassed}/${totalTests} 测试通过 (${(totalPassed/totalTests*100).toFixed(1)}%)`, 
      totalPassed === totalTests ? 'green' : 'yellow')

  const allPassed = results.every(r => r.passed)
  log(`\n整体状态: ${allPassed ? '✅ 所有测试通过' : '⚠️ 存在失败的测试'}`, 
      allPassed ? 'green' : 'yellow')

  return {
    totalTests,
    totalPassed,
    passRate: totalPassed / totalTests,
    allPassed
  }
}

// 主测试函数
async function runAllTests() {
  log('🧪 开始运行全面测试套件', 'cyan')
  log(`时间: ${new Date().toISOString()}`, 'cyan')

  const results = []

  try {
    // 运行所有测试
    results.push(await runCodeQualityTests())
    results.push(await runDependencyTests())
    results.push(await runEnvironmentTests())
    results.push(await runBuildTests())
    results.push(await runSecurityTests())

    // 生成报告
    const report = generateReport(results)

    // 保存报告到文件
    const reportData = {
      timestamp: new Date().toISOString(),
      results,
      summary: report
    }

    await fs.writeFile(
      'test-report.json', 
      JSON.stringify(reportData, null, 2)
    )

    log('\n📄 详细报告已保存到 test-report.json', 'blue')

    // 退出码
    process.exit(report.allPassed ? 0 : 1)

  } catch (error) {
    log(`\n❌ 测试套件执行失败: ${error.message}`, 'red')
    process.exit(1)
  }
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
}