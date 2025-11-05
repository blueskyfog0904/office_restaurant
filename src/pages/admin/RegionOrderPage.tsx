import React, { useState, useEffect } from 'react';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface RegionOrder {
  id: number;
  province_name: string;
  display_order: number;
  is_active: boolean;
}

const RegionOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<RegionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadRegionOrders();
  }, []);

  const loadRegionOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/api/region-order');
      const data = await response.json();
      setOrders(data);
      setHasChanges(false);
    } catch (error) {
      console.error('지역 순서 로드 실패:', error);
      alert('지역 순서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    
    const newOrders = [...orders];
    [newOrders[index - 1], newOrders[index]] = [newOrders[index], newOrders[index - 1]];
    
    // display_order 업데이트
    newOrders.forEach((order, idx) => {
      order.display_order = idx + 1;
    });
    
    setOrders(newOrders);
    setHasChanges(true);
  };

  const moveDown = (index: number) => {
    if (index === orders.length - 1) return;
    
    const newOrders = [...orders];
    [newOrders[index + 1], newOrders[index]] = [newOrders[index], newOrders[index + 1]];
    
    // display_order 업데이트
    newOrders.forEach((order, idx) => {
      order.display_order = idx + 1;
    });
    
    setOrders(newOrders);
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const response = await fetch('http://localhost:8000/api/v1/api/region-order/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orders: orders.map(order => ({
            province_name: order.province_name,
            display_order: order.display_order
          }))
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('저장 실패');
      }

      alert('지역 순서가 저장되었습니다.');
      setHasChanges(false);
    } catch (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다. 관리자 권한이 필요합니다.');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    loadRegionOrders();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">시도 표시 순서 관리</h1>
        <p className="text-gray-600">
          시도가 표시되는 순서를 변경할 수 있습니다. 변경 후 저장 버튼을 눌러주세요.
        </p>
      </div>

      {hasChanges && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-yellow-800">변경 사항이 있습니다. 저장하시겠습니까?</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetChanges}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <XMarkIcon className="h-5 w-5 inline mr-1" />
              취소
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckIcon className="h-5 w-5 inline mr-1" />
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  순서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  시도명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order, index) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.province_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-300 disabled:cursor-not-allowed mr-3"
                      title="위로 이동"
                    >
                      <ArrowUpIcon className="h-5 w-5 inline" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === orders.length - 1}
                      className="text-blue-600 hover:text-blue-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="아래로 이동"
                    >
                      <ArrowDownIcon className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">안내사항</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>위/아래 화살표 버튼을 클릭하여 순서를 변경할 수 있습니다.</li>
          <li>변경된 순서는 저장 버튼을 눌러야 적용됩니다.</li>
          <li>저장된 순서는 즉시 사용자 페이지에 반영됩니다.</li>
          <li>시군구는 자동으로 가나다순으로 정렬됩니다.</li>
        </ul>
      </div>
    </div>
  );
};

export default RegionOrderPage;

