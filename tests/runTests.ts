import { testSuite } from '../src/server/testSuite.js';

async function main() {
  console.log('\n================================================================');
  console.log('   THE UNIFIED SERVICE SCHEDULER — AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  try {
    const report = await testSuite.runAllTests();

    console.log(`Execution Timestamp: ${report.timestamp}`);
    console.log(`Total Duration:       ${report.totalDurationMs}ms\n`);

    report.results.forEach((test, idx) => {
      const statusSymbol = test.passed ? '✓ PASS' : '✗ FAIL';
      const color = test.passed ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`[${idx + 1}/${report.totalTests}] ${color}${statusSymbol}${reset} ${test.id}: ${test.name} (${test.durationMs}ms)`);
      console.log(`    Category:  ${test.category}`);
      console.log(`    Summary:   ${test.assertionSummary}`);
      console.log(`    Expected:  ${test.expected}`);
      console.log(`    Actual:    ${test.actual}`);
      if (test.error) {
        console.log(`    Error:     ${test.error}`);
      }
      console.log('');
    });

    console.log('----------------------------------------------------------------');
    console.log(`Test Summary: ${report.passedTests} Passed, ${report.failedTests} Failed of ${report.totalTests} total tests`);
    console.log('----------------------------------------------------------------\n');

    if (!report.allPassed) {
      console.error('\x1b[31m[FAILED] Test suite encountered failures.\x1b[0m\n');
      process.exit(1);
    } else {
      console.log('\x1b[32m[SUCCESS] All test suite assertions passed successfully!\x1b[0m\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error executing test suite:', err);
    process.exit(1);
  }
}

main();
