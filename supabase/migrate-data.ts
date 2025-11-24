/**
 * Data Migration Script: Prisma (Vercel Postgres) → Supabase PostgreSQL
 *
 * Run this script to export existing data from Prisma and import to Supabase
 *
 * Usage:
 * 1. Make sure schema.sql and rls-policies.sql are run in Supabase first
 * 2. Run: npx tsx supabase/migrate-data.ts
 * 3. This will export data to JSON files in supabase/export/
 * 4. Then import data to Supabase using the Supabase client
 */

import { prisma } from '../lib/prisma.js';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXPORT_DIR = path.join(process.cwd(), 'supabase', 'export');

async function ensureExportDir() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

async function exportFromPrisma() {
  console.log('📦 Exporting data from Prisma (Vercel Postgres)...\n');

  try {
    // Export Users
    const users = await prisma.user.findMany();
    console.log(`✓ Found ${users.length} users`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'users.json'),
      JSON.stringify(users, null, 2)
    );

    // Export Usage Tracking
    const usageTracking = await prisma.usageTracking.findMany();
    console.log(`✓ Found ${usageTracking.length} usage tracking records`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'usage-tracking.json'),
      JSON.stringify(usageTracking, null, 2)
    );

    // Export Portfolios
    const portfolios = await prisma.portfolio.findMany();
    console.log(`✓ Found ${portfolios.length} portfolios`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'portfolios.json'),
      JSON.stringify(portfolios, null, 2)
    );

    // Export Stocks
    const stocks = await prisma.stock.findMany();
    console.log(`✓ Found ${stocks.length} stocks`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'stocks.json'),
      JSON.stringify(stocks, null, 2)
    );

    // Export Investment Theses
    const theses = await prisma.investmentThesis.findMany();
    console.log(`✓ Found ${theses.length} investment theses`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'theses.json'),
      JSON.stringify(theses, null, 2)
    );

    // Export Daily Checklists
    const checklists = await prisma.dailyChecklist.findMany();
    console.log(`✓ Found ${checklists.length} checklists`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'checklists.json'),
      JSON.stringify(checklists, null, 2)
    );

    // Export Checklist Tasks
    const tasks = await prisma.checklistTask.findMany();
    console.log(`✓ Found ${tasks.length} tasks`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'tasks.json'),
      JSON.stringify(tasks, null, 2)
    );

    // Export Waitlist
    const waitlist = await prisma.waitlist.findMany();
    console.log(`✓ Found ${waitlist.length} waitlist entries`);
    fs.writeFileSync(
      path.join(EXPORT_DIR, 'waitlist.json'),
      JSON.stringify(waitlist, null, 2)
    );

    console.log(`\n✅ Export completed! Files saved to ${EXPORT_DIR}\n`);

    return {
      users,
      usageTracking,
      portfolios,
      stocks,
      theses,
      checklists,
      tasks,
      waitlist,
    };
  } catch (error) {
    console.error('❌ Error exporting from Prisma:', error);
    throw error;
  }
}

async function importToSupabase(data: any) {
  console.log('📥 Importing data to Supabase...\n');

  try {
    // Note: Users are managed by Supabase Auth (auth.users)
    // We need to create profiles for existing users
    console.log('Importing profiles...');
    const profiles = data.users.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      tier: user.tier,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    }));

    const { error: profilesError } = await supabase
      .from('profiles')
      .insert(profiles);

    if (profilesError) {
      console.error('❌ Error importing profiles:', profilesError);
    } else {
      console.log(`✓ Imported ${profiles.length} profiles`);
    }

    // Import Usage Tracking
    if (data.usageTracking.length > 0) {
      console.log('Importing usage tracking...');
      const usage = data.usageTracking.map((u: any) => ({
        id: u.id,
        user_id: u.userId,
        tier: u.tier,
        chat_queries: u.chatQueries,
        portfolio_analysis: u.portfolioAnalysis,
        sec_filings: u.secFilings,
        period_start: u.periodStart,
        period_end: u.periodEnd,
        created_at: u.createdAt,
      }));

      const { error: usageError } = await supabase
        .from('usage_tracking')
        .insert(usage);

      if (usageError) {
        console.error('❌ Error importing usage tracking:', usageError);
      } else {
        console.log(`✓ Imported ${usage.length} usage tracking records`);
      }
    }

    // Import Portfolios
    if (data.portfolios.length > 0) {
      console.log('Importing portfolios...');
      const portfolios = data.portfolios.map((p: any) => ({
        id: p.id,
        user_id: p.userId,
        name: p.name,
        type: p.type,
        initial_value: p.initialValue,
        target_value: p.targetValue,
        borrowed_amount: p.borrowedAmount,
        margin_call_level: p.marginCallLevel,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));

      const { error: portfoliosError } = await supabase
        .from('portfolios')
        .insert(portfolios);

      if (portfoliosError) {
        console.error('❌ Error importing portfolios:', portfoliosError);
      } else {
        console.log(`✓ Imported ${portfolios.length} portfolios`);
      }
    }

    // Import Stocks
    if (data.stocks.length > 0) {
      console.log('Importing stocks...');
      const stocks = data.stocks.map((s: any) => ({
        id: s.id,
        portfolio_id: s.portfolioId,
        symbol: s.symbol,
        name: s.name,
        shares: s.shares,
        avg_price: s.avgPrice,
        current_price: s.currentPrice,
        actual_value: s.actualValue,
        last_updated: s.lastUpdated,
        created_at: s.createdAt,
      }));

      const { error: stocksError } = await supabase
        .from('stocks')
        .insert(stocks);

      if (stocksError) {
        console.error('❌ Error importing stocks:', stocksError);
      } else {
        console.log(`✓ Imported ${stocks.length} stocks`);
      }
    }

    // Import Investment Theses
    if (data.theses.length > 0) {
      console.log('Importing investment theses...');
      const theses = data.theses.map((t: any) => ({
        id: t.id,
        portfolio_id: t.portfolioId,
        ticker: t.ticker,
        title: t.title,
        description: t.description,
        rationale: t.rationale,
        bear_case: t.bearCase,
        risks: t.risks,
        key_metrics: t.keyMetrics,
        stop_loss_rules: t.stopLossRules,
        exit_criteria: t.exitCriteria,
        thesis_health_score: t.thesisHealthScore,
        urgency: t.urgency,
        last_validated: t.lastValidated,
        validation_history: t.validationHistory,
        status: t.status,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }));

      const { error: thesesError } = await supabase
        .from('investment_theses')
        .insert(theses);

      if (thesesError) {
        console.error('❌ Error importing theses:', thesesError);
      } else {
        console.log(`✓ Imported ${theses.length} investment theses`);
      }
    }

    // Import Daily Checklists
    if (data.checklists.length > 0) {
      console.log('Importing checklists...');
      const checklists = data.checklists.map((c: any) => ({
        id: c.id,
        portfolio_id: c.portfolioId,
        date: c.date,
        total_tasks: c.totalTasks,
        completed_tasks: c.completedTasks,
        completion_percentage: c.completionPercentage,
        current_streak: c.currentStreak,
        longest_streak: c.longestStreak,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }));

      const { error: checklistsError } = await supabase
        .from('daily_checklists')
        .insert(checklists);

      if (checklistsError) {
        console.error('❌ Error importing checklists:', checklistsError);
      } else {
        console.log(`✓ Imported ${checklists.length} checklists`);
      }
    }

    // Import Checklist Tasks
    if (data.tasks.length > 0) {
      console.log('Importing tasks...');
      const tasks = data.tasks.map((t: any) => ({
        id: t.id,
        checklist_id: t.checklistId,
        portfolio_id: t.portfolioId,
        task: t.task,
        category: t.category,
        frequency: t.frequency,
        urgency: t.urgency,
        completed: t.completed,
        completed_at: t.completedAt,
        condition: t.condition,
        due_date: t.dueDate,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }));

      const { error: tasksError } = await supabase
        .from('checklist_tasks')
        .insert(tasks);

      if (tasksError) {
        console.error('❌ Error importing tasks:', tasksError);
      } else {
        console.log(`✓ Imported ${tasks.length} tasks`);
      }
    }

    // Import Waitlist
    if (data.waitlist.length > 0) {
      console.log('Importing waitlist...');
      const waitlist = data.waitlist.map((w: any) => ({
        id: w.id,
        email: w.email,
        name: w.name,
        notified: w.notified,
        created_at: w.createdAt,
      }));

      const { error: waitlistError } = await supabase
        .from('waitlist')
        .insert(waitlist);

      if (waitlistError) {
        console.error('❌ Error importing waitlist:', waitlistError);
      } else {
        console.log(`✓ Imported ${waitlist.length} waitlist entries`);
      }
    }

    console.log('\n✅ Import completed!\n');
  } catch (error) {
    console.error('❌ Error importing to Supabase:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting data migration from Prisma to Supabase\n');
  console.log('=' .repeat(60));

  await ensureExportDir();

  // Step 1: Export from Prisma
  const data = await exportFromPrisma();

  console.log('=' .repeat(60));

  // Step 2: Import to Supabase
  await importToSupabase(data);

  console.log('=' .repeat(60));
  console.log('\n✅ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Verify data in Supabase Dashboard');
  console.log('2. Update API routes to use Supabase client');
  console.log('3. Remove Prisma dependencies');
  console.log('4. Update DATABASE_URL to point to Supabase (if needed)\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
