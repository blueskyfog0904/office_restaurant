import React from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface DateFilterProps {
  selectedYear?: number;
  selectedMonth?: number;
  onYearChange: (year: number | undefined) => void;
  onMonthChange: (month: number | undefined) => void;
  className?: string;
}

const DateFilter: React.FC<DateFilterProps> = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  className = ''
}) => {
  // 현재 연도부터 과거 5년까지의 연도 목록 생성
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  
  // 월 목록
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onYearChange(value ? parseInt(value) : undefined);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onMonthChange(value ? parseInt(value) : undefined);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CalendarIcon className="h-5 w-5 text-gray-500" />
      
      {/* 연도 선택 */}
      <select
        value={selectedYear || ''}
        onChange={handleYearChange}
        className="
          px-3 py-2 border border-gray-300 rounded-md
          bg-white text-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          hover:border-gray-400 transition-colors
        "
        aria-label="연도 선택"
      >
        <option value="">전체 연도</option>
        {years.map(year => (
          <option key={year} value={year}>
            {year}년
          </option>
        ))}
      </select>

      {/* 월 선택 */}
      <select
        value={selectedMonth || ''}
        onChange={handleMonthChange}
        className="
          px-3 py-2 border border-gray-300 rounded-md
          bg-white text-sm
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          hover:border-gray-400 transition-colors
        "
        aria-label="월 선택"
      >
        <option value="">전체 월</option>
        {months.map(month => (
          <option key={month} value={month}>
            {month}월
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateFilter; 