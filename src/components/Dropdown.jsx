import { useState, useRef, useEffect } from 'react';

const Dropdown = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    className = '',
    buttonClassName = '',
    variant = 'default', // 'default' or 'compact'
    showSelected = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = showSelected ? options.find(opt => opt.value === value) : null;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const defaultButtonClasses = variant === 'compact'
        ? `w-full flex items-center justify-between px-4 py-2.5 bg-white border border-zinc-200 rounded-xl outline-none transition-all hover:bg-zinc-50 hover:shadow-sm ${isOpen ? 'border-zinc-900 ring-2 ring-zinc-100' : ''}`
        : `w-full flex items-center justify-between px-6 py-5 bg-zinc-50 border border-transparent rounded-[1.25rem] focus:bg-white focus:border-zinc-900 outline-none transition-all group ${isOpen ? 'bg-white border-zinc-900 ring-4 ring-primary-50' : 'hover:bg-zinc-100'}`;

    const finalButtonClasses = buttonClassName || defaultButtonClasses;

    const textClasses = variant === 'compact'
        ? `text-[11px] font-bold tracking-tight ${selectedOption ? '' : 'text-zinc-500'}`
        : `text-sm font-bold tracking-tight ${selectedOption ? 'text-zinc-900' : 'text-zinc-400'}`;

    const listClasses = variant === 'compact'
        ? 'absolute z-[100] min-w-full mt-2 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 right-0'
        : 'absolute z-[100] w-full mt-3 bg-white border border-zinc-100 rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200';

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block mb-2 ml-1">
                    {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={finalButtonClasses}
            >
                <span className={textClasses}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${variant === 'compact' ? 'w-3 h-3 ml-2' : 'w-5 h-5 ml-4'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className={listClasses}>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {options.length > 0 ? (
                            options.map((option) => {
                                const isSelected = value === option.value && showSelected;
                                return (
                                <button
                                    key={option.value}
                                    type="button"
                                    disabled={option.disabled}
                                    onClick={() => {
                                        if(!option.disabled) {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={`w-full text-left py-3 transition-all flex items-center justify-between whitespace-nowrap relative
                                        ${option.disabled ? 'opacity-50 cursor-not-allowed bg-zinc-50' : isSelected ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'} 
                                        ${variant === 'compact' ? 'text-[11px] py-2' : 'text-sm'} 
                                        ${option.isSubItem ? `pl-[2.75rem] pr-5 font-semibold ${isSelected ? '' : 'text-zinc-600'}` : 'px-5 font-bold'} 
                                        ${option.isParent ? 'bg-zinc-50/80 border-t border-zinc-100' : ''}`}
                                >
                                    {option.isSubItem && (
                                        <div className={`absolute left-[1.25rem] top-0 w-[2px] ${isSelected ? 'bg-zinc-700' : 'bg-zinc-200'} ${option.isLastSubItem ? 'bottom-1/2' : 'bottom-0'}`}></div>
                                    )}
                                    {option.isSubItem && (
                                        <div className={`absolute left-[1.25rem] top-1/2 w-4 h-[2px] ${isSelected ? 'bg-zinc-700' : 'bg-zinc-200'} rounded-r-full`}></div>
                                    )}
                                    <span className="relative z-10 truncate">{option.label}</span>
                                    {isSelected && (
                                        <svg className={`w-4 h-4 ml-2 shrink-0 ${isSelected ? 'text-white' : 'text-zinc-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            )})
                        ) : (
                            <div className="px-6 py-8 text-center text-zinc-400 italic font-bold">
                                No items available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dropdown;
