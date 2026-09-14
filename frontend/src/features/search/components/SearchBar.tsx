import React from 'react';

export const SearchBar: React.FC = () => {
  return (
    <div className="search-bar w-full max-w-md">
      <input 
        type="text" 
        placeholder="Tìm kiếm nhà hàng, món ăn..." 
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
};
