"use client";

const SearchBar = ({ label = "Search", value, onChange, placeholder }) => (
  <label className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
    {label ? <span className="text-sm text-gray-500">{label}</span> : null}
    <input
      type="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-40 bg-transparent text-sm outline-none placeholder:text-gray-400"
      aria-label={label || placeholder}
    />
  </label>
);

export default SearchBar;
