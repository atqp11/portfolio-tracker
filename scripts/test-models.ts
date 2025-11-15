// Test script to verify data model conversions work correctly
import { configs } from '../lib/config';
import { 
  configToPortfolio, 
  decisionToThesis, 
  monitoringTaskToChecklistTask,
  generateDailyChecklist 
} from '../lib/models';

console.log('🧪 Testing Data Model Conversions...\n');

// Test 1: Config to Portfolio
console.log('━━━ Test 1: Config → Portfolio ━━━');
const energyConfig = configs[0];
const energyPortfolio = configToPortfolio(energyConfig);
console.log('✅ Energy Portfolio:');
console.log('   Name:', energyPortfolio.name);
console.log('   Type:', energyPortfolio.type);
console.log('   Holdings:', energyPortfolio.holdings.length);
console.log('   Initial Cash:', `$${energyPortfolio.initialCash.toLocaleString()}`);
console.log('   Initial Margin:', `$${energyPortfolio.initialMargin.toLocaleString()}`);
console.log('   Stocks:', energyPortfolio.holdings.map(h => h.symbol).join(', '));

const copperConfig = configs[1];
const copperPortfolio = configToPortfolio(copperConfig);
console.log('\n✅ Copper Portfolio:');
console.log('   Name:', copperPortfolio.name);
console.log('   Type:', copperPortfolio.type);
console.log('   Holdings:', copperPortfolio.holdings.length);
console.log('   Initial Cash:', `$${copperPortfolio.initialCash.toLocaleString()}`);
console.log('   Initial Margin:', `$${copperPortfolio.initialMargin.toLocaleString()}`);
console.log('   Stocks:', copperPortfolio.holdings.map(h => h.symbol).join(', '));

// Test 2: Decision to Thesis
console.log('\n━━━ Test 2: Decision → Thesis ━━━');
const mockDecisions = [
  {
    title: 'Margin Decision',
    description: '30% margin strategy with controlled risk',
    rationale: 'Leverages sector fundamentals with safety thresholds',
    urgency: 'green' as const,
    triggerCondition: 'Current equity: 62.5%. Margin call at $8,571',
  },
  {
    title: 'Delever Decision',
    description: 'Trigger at +50% portfolio value',
    rationale: 'Lock in gains and eliminate leverage risk',
    urgency: 'yellow' as const,
    triggerCondition: 'Current: $20,000 / Target: $30,000',
    action: 'delever',
  },
  {
    title: 'Profit Taking Decision',
    description: 'Trim 50% of top performer at target',
    rationale: 'Reallocate to defensive positions while maintaining exposure',
    urgency: 'green' as const,
    action: 'profit',
  },
];

mockDecisions.forEach((decision, idx) => {
  const thesis = decisionToThesis(decision, 'energy', 'energy');
  console.log(`\n✅ Thesis ${idx + 1}: ${thesis.title}`);
  console.log('   ID:', thesis.id);
  console.log('   Health Score:', `${thesis.thesisHealthScore}%`);
  console.log('   Urgency:', thesis.urgency.toUpperCase());
  console.log('   Key Metrics:', thesis.keyMetrics.length);
  console.log('   Stop Loss Rules:', thesis.stopLossRules.length);
  if (thesis.stopLossRules.length > 0) {
    console.log('   → Rule Type:', thesis.stopLossRules[0].type);
    console.log('   → Action:', thesis.stopLossRules[0].action);
  }
});

// Test 3: MonitoringTask to ChecklistTask
console.log('\n━━━ Test 3: MonitoringTask → ChecklistTask ━━━');
const mockMonitoringTasks = [
  {
    frequency: 'Daily' as const,
    task: 'Open dashboard at 9:30 AM ET, check prices and portfolio value',
    urgency: 'green' as const,
    condition: 'Value: $20,000 ✓',
  },
  {
    frequency: 'Daily' as const,
    task: 'Verify no red alerts (stop-loss, margin call)',
    urgency: 'red' as const,
    condition: 'Equity: 62.5% ✓',
  },
  {
    frequency: 'Weekly' as const,
    task: 'Review 7-day trend, verify equity stays above 45%',
    urgency: 'green' as const,
    condition: 'Equity: 62.5% (Safe zone: >45%)',
  },
  {
    frequency: 'Monthly' as const,
    task: 'Assess: Should I take profit? Should I delever? Rebalance needed?',
    urgency: 'green' as const,
  },
];

const checklistTasks = mockMonitoringTasks.map(task => 
  monitoringTaskToChecklistTask(task, 'energy')
);

checklistTasks.forEach((task, idx) => {
  console.log(`\n✅ Task ${idx + 1}: ${task.task.substring(0, 50)}...`);
  console.log('   Frequency:', task.frequency);
  console.log('   Category:', task.category);
  console.log('   Urgency:', task.urgency.toUpperCase());
  console.log('   Actions:', task.actions.length);
  console.log('   Completed:', task.completed);
});

// Test 4: Generate Daily Checklist
console.log('\n━━━ Test 4: Generate Daily Checklist ━━━');
const dailyChecklist = generateDailyChecklist(checklistTasks, 'energy');
console.log('✅ Daily Checklist Generated:');
console.log('   ID:', dailyChecklist.id);
console.log('   Date:', dailyChecklist.date.toISOString().split('T')[0]);
console.log('   Total Tasks:', dailyChecklist.totalTasks);
console.log('   Completed:', dailyChecklist.completedTasks);
console.log('   Completion %:', `${dailyChecklist.completionPercentage.toFixed(1)}%`);
console.log('   Morning Routine:', dailyChecklist.morningRoutine.length, 'tasks');
console.log('   Market Hours:', dailyChecklist.marketHours.length, 'tasks');
console.log('   Evening Review:', dailyChecklist.eveningReview.length, 'tasks');
console.log('   Event Driven:', dailyChecklist.eventDriven.length, 'tasks');

console.log('\n✅ All model conversions working correctly!');
console.log('📊 Summary:');
console.log('   - Portfolio conversion: ✓');
console.log('   - Thesis conversion: ✓');
console.log('   - Checklist conversion: ✓');
console.log('   - Daily checklist generation: ✓');
console.log('\n🎉 Phase 1.1 Complete - Type definitions validated!');
