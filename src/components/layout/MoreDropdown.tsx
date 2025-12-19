import React, { Fragment, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export type MoreItem = {
  label: string;
  to: string;
  description?: string;
  isActive?: (pathname: string) => boolean;
};

type Props = {
  label?: string;
  items: MoreItem[];
  align?: 'left' | 'right';
};

const MoreDropdown: React.FC<Props> = ({ label = '더보기', items, align = 'right' }) => {
  const { pathname } = useLocation();
  const isAnyActive = items.some((i) => i.isActive?.(pathname) || pathname === i.to);

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={[
              'relative inline-flex items-center gap-1 px-3 py-2 rounded-md transition-colors duration-150 outline-none',
              'text-[13px] font-semibold tracking-[0.06em]',
              isAnyActive ? 'text-gray-900 bg-gray-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
              'after:absolute after:left-3 after:right-3 after:bottom-1 after:h-[2px] after:rounded-full',
              isAnyActive ? 'after:bg-primary-600' : 'after:bg-transparent',
            ].join(' ')}
          >
            {label}
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className={[
                'absolute z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-xl',
                align === 'right' ? 'right-0' : 'left-0',
              ].join(' ')}
            >
              <div className="py-1">
                {items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-gray-900 tracking-[0.02em]">
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">›</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default memo(MoreDropdown);




