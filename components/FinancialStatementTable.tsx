// components/FinancialStatementTable.tsx
'use client';

import { useState } from 'react';
import { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/lib/api/alphavantage';

interface FinancialStatementTableProps {
  income: IncomeStatement[];
  balance: BalanceSheet[];
  cashFlow: CashFlowStatement[];
}

type TabType = 'income' | 'balance' | 'cashflow';

export default function FinancialStatementTable({
  income,
  balance,
  cashFlow,
}: FinancialStatementTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('income');

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) return '-';
    
    // Format in billions or millions
    if (Math.abs(num) >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (Math.abs(num) >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else {
      return `$${num.toLocaleString()}`;
    }
  };

  const formatDate = (date: string): string => {
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return date;
    }
  };

  const tabs = [
    { id: 'income' as TabType, label: 'Income Statement', count: income.length },
    { id: 'balance' as TabType, label: 'Balance Sheet', count: balance.length },
    { id: 'cashflow' as TabType, label: 'Cash Flow', count: cashFlow.length },
  ];

  // Render Income Statement
  const renderIncomeStatement = () => {
    const periods = income.slice(0, 10); // Show 10 years max
    if (periods.length === 0) {
      return <div className="text-[#71717A] text-center py-8">No income statement data available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] sticky top-0">
            <tr>
              <th className="text-left p-3 text-[#A1A1AA] font-medium border-b border-[#1A1A1A]">
                Metric
              </th>
              {periods.map((period) => (
                <th
                  key={period.fiscalDateEnding}
                  className="text-right p-3 text-[#A1A1AA] font-medium border-b border-[#1A1A1A] whitespace-nowrap"
                >
                  {formatDate(period.fiscalDateEnding)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer">
              <td className="p-3 text-[#FAFAFA] font-semibold">Total Revenue</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#FAFAFA] font-mono">
                  {formatCurrency(period.totalRevenue)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer">
              <td className="p-3 text-[#A1A1AA]">Cost of Revenue</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.costOfRevenue)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#10B981]/10 transition-colors cursor-pointer bg-[#10B981]/5">
              <td className="p-3 text-[#10B981] font-semibold">Gross Profit</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#10B981] font-mono font-semibold">
                  {formatCurrency(period.grossProfit)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer">
              <td className="p-3 text-[#A1A1AA]">Operating Expenses</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.operatingExpenses)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer">
              <td className="p-3 text-[#A1A1AA] pl-6">→ R&D</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#71717A] font-mono">
                  {formatCurrency(period.researchAndDevelopment)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors cursor-pointer">
              <td className="p-3 text-[#A1A1AA] pl-6">→ SG&A</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#71717A] font-mono">
                  {formatCurrency(period.sellingGeneralAndAdministrative)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#3B82F6]/10 transition-colors cursor-pointer bg-[#3B82F6]/5">
              <td className="p-3 text-[#3B82F6] font-semibold">Operating Income</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#3B82F6] font-mono font-semibold">
                  {formatCurrency(period.operatingIncome)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA]">Interest Expense</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.interestExpense)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA]">Income Tax Expense</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.incomeTaxExpense)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#10B981]/15 transition-colors cursor-pointer bg-[#10B981]/10">
              <td className="p-3 text-[#10B981] font-bold">Net Income</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#10B981] font-mono font-bold">
                  {formatCurrency(period.netIncome)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#7C3AED] font-semibold">EBITDA</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#7C3AED] font-mono font-semibold">
                  {formatCurrency(period.ebitda)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render Balance Sheet
  const renderBalanceSheet = () => {
    const periods = balance.slice(0, 10);
    if (periods.length === 0) {
      return <div className="text-[#71717A] text-center py-8">No balance sheet data available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] sticky top-0">
            <tr>
              <th className="text-left p-3 text-[#A1A1AA] font-medium border-b border-[#1A1A1A]">
                Metric
              </th>
              {periods.map((period) => (
                <th
                  key={period.fiscalDateEnding}
                  className="text-right p-3 text-[#A1A1AA] font-medium border-b border-[#1A1A1A] whitespace-nowrap"
                >
                  {formatDate(period.fiscalDateEnding)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111] bg-[#10B981]/5">
              <td className="p-3 text-[#10B981] font-bold">Total Assets</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#10B981] font-mono font-bold">
                  {formatCurrency(period.totalAssets)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA] pl-6">Current Assets</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.totalCurrentAssets)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA] pl-12">→ Cash</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#71717A] font-mono">
                  {formatCurrency(period.cashAndCashEquivalentsAtCarryingValue)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#EF4444] font-bold">Total Liabilities</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#EF4444] font-mono font-bold">
                  {formatCurrency(period.totalLiabilities)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA] pl-6">Current Liabilities</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.totalCurrentLiabilities)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA] pl-6">Long-term Debt</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.longTermDebt)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111] bg-[#3B82F6]/5">
              <td className="p-3 text-[#3B82F6] font-bold">Total Equity</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#3B82F6] font-mono font-bold">
                  {formatCurrency(period.totalShareholderEquity)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Render Cash Flow Statement
  const renderCashFlow = () => {
    const periods = cashFlow.slice(0, 10);
    if (periods.length === 0) {
      return <div className="text-[#71717A] text-center py-8">No cash flow data available</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] sticky top-0">
            <tr>
              <th className="text-left p-3 text-[#A1A1AA] font-medium border-b border-[#1A1A1A]">
                Metric
              </th>
              {periods.map((period) => (
                <th
                  key={period.fiscalDateEnding}
                  className="text-right p-3 text-[#A1A1AA] font-medium border-b border-[#1A1A1A] whitespace-nowrap"
                >
                  {formatDate(period.fiscalDateEnding)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111] bg-[#10B981]/5">
              <td className="p-3 text-[#10B981] font-bold">Operating Cash Flow</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#10B981] font-mono font-bold">
                  {formatCurrency(period.operatingCashflow)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA]">Capital Expenditures</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#EF4444] font-mono">
                  {formatCurrency(period.capitalExpenditures)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111] bg-[#3B82F6]/5">
              <td className="p-3 text-[#3B82F6] font-semibold">Free Cash Flow</td>
              {periods.map((period) => {
                const ocf = parseFloat(period.operatingCashflow);
                const capex = Math.abs(parseFloat(period.capitalExpenditures));
                const fcf = ocf - capex;
                return (
                  <td key={period.fiscalDateEnding} className="p-3 text-right text-[#3B82F6] font-mono font-semibold">
                    {formatCurrency(fcf)}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA]">Investing Cash Flow</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.cashflowFromInvestment)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#A1A1AA]">Financing Cash Flow</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#A1A1AA] font-mono">
                  {formatCurrency(period.cashflowFromFinancing)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-[#1A1A1A] hover:bg-[#111111]">
              <td className="p-3 text-[#7C3AED]">Dividend Payout</td>
              {periods.map((period) => (
                <td key={period.fiscalDateEnding} className="p-3 text-right text-[#7C3AED] font-mono">
                  {formatCurrency(period.dividendPayout)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[#1A1A1A] bg-[#0A0A0A]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-all duration-200 relative ${
              activeTab === tab.id
                ? 'text-[#FAFAFA] bg-[#111111]'
                : 'text-[#71717A] hover:text-[#3B82F6] hover:bg-[#0F0F0F]'
            }`}
          >
            {tab.label}
            <span className={`ml-2 text-xs transition-colors ${activeTab === tab.id ? 'text-[#71717A]' : 'text-[#52525B]'}`}>({tab.count})</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6] shadow-sm shadow-[#3B82F6]" />
            )}
          </button>
        ))}
      </div>

      {/* Table Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {activeTab === 'income' && renderIncomeStatement()}
        {activeTab === 'balance' && renderBalanceSheet()}
        {activeTab === 'cashflow' && renderCashFlow()}
      </div>
    </div>
  );
}
