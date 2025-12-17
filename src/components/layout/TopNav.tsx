import React, { memo } from 'react';
import { useLocation, Link } from 'react-router-dom';

export type TopNavItem = {
  label: string;
  to: string;
  isActive: (pathname: string) => boolean;
};

type Props = {
  items: TopNavItem[];
  className?: string;
};

const TopNav: React.FC<Props> = ({ items, className = '' }) => {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className={`flex items-center gap-2 ${className}`} aria-label="Primary">
      {items.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={[
              'relative px-3 py-2 rounded-md transition-colors duration-150',
              'text-[13px] font-semibold tracking-[0.06em]',
              active
                ? 'text-gray-900 bg-gray-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              // underline bar (no layout shift)
              'after:absolute after:left-3 after:right-3 after:bottom-1 after:h-[2px] after:rounded-full',
              active ? 'after:bg-primary-600' : 'after:bg-transparent',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default memo(TopNav);



