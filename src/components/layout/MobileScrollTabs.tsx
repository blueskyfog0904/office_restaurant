import React, { Fragment, memo, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';

export type MobileTab = {
  label: string;
  to: string;
  isActive: (pathname: string) => boolean;
};

export type MobileMoreItem = {
  label: string;
  to: string;
  description?: string;
};

type Props = {
  tabs: MobileTab[];
  moreItems: MobileMoreItem[];
};

const MobileScrollTabs: React.FC<Props> = ({ tabs, moreItems }) => {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const activeIndex = useMemo(() => {
    const idx = tabs.findIndex((t) => t.isActive(pathname));
    return idx >= 0 ? idx : 0;
  }, [pathname, tabs]);

  return (
    <>
      <div className="border-t border-gray-100 bg-white">
        <div
          className={[
            'flex items-center gap-1 px-2 py-2 overflow-x-auto',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          ].join(' ')}
        >
          {tabs.map((t, idx) => {
            const active = idx === activeIndex;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={[
                  'relative shrink-0 px-3 py-2 rounded-md',
                  'text-[13px] font-semibold tracking-[0.06em]',
                  active ? 'text-gray-900 bg-gray-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                  'after:absolute after:left-3 after:right-3 after:bottom-1 after:h-[2px] after:rounded-full',
                  active ? 'after:bg-primary-600' : 'after:bg-transparent',
                ].join(' ')}
              >
                {t.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="shrink-0 px-3 py-2 rounded-md text-[13px] font-semibold tracking-[0.06em] text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            더보기
          </button>
        </div>
      </div>

      <Transition show={moreOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setMoreOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0">
              <Transition.Child
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="translate-y-4 opacity-0"
                enterTo="translate-y-0 opacity-100"
                leave="transition ease-in duration-150"
                leaveFrom="translate-y-0 opacity-100"
                leaveTo="translate-y-4 opacity-0"
              >
                <Dialog.Panel className="bg-white rounded-t-2xl shadow-2xl border-t border-gray-100">
                  <div className="px-4 pt-3 pb-2">
                    <div className="mx-auto h-1 w-10 rounded-full bg-gray-200" />
                    <Dialog.Title className="mt-3 text-sm font-bold tracking-[0.06em] text-gray-900">
                      커뮤니티 더보기
                    </Dialog.Title>
                    <div className="mt-3 divide-y divide-gray-100">
                      {moreItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMoreOpen(false)}
                          className="block py-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[13px] font-semibold text-gray-900">{item.label}</div>
                              {item.description && <div className="mt-0.5 text-xs text-gray-500">{item.description}</div>}
                            </div>
                            <div className="text-[11px] text-gray-400">›</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => setMoreOpen(false)}
                      className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      닫기
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default memo(MobileScrollTabs);



