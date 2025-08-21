import React from 'react';
import { useNavigate } from 'react-router-dom';

const RegisterEntry: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded shadow p-6 text-center space-y-4">
      <h2 className="text-2xl font-bold">회원가입</h2>
      <button onClick={() => navigate('/register/terms')} className="w-full bg-blue-600 text-white py-2 rounded">이메일로 계속</button>
      <button onClick={() => navigate('/register/terms')} className="w-full bg-yellow-400 py-2 rounded">카카오로 계속</button>
    </div>
  );
};

export default RegisterEntry;


