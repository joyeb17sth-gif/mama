import React, { useRef, useEffect, Fragment } from 'react';
import { format, parseISO } from 'date-fns';
import html2pdf from 'html2pdf.js';

const Payslip = ({ payment, period, contractor, onBack }) => {
    const payslipRef = useRef();

    if (!payment || !contractor) return null;

    useEffect(() => {
        const originalTitle = document.title;
        document.title = `Payslip - ${contractor.name} - ${period}`;
        return () => {
            document.title = originalTitle;
        };
    }, [contractor.name, period]);

    const handleDownload = () => {
        const element = payslipRef.current;
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Payslip - ${contractor.name} - ${period}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                windowWidth: 1100 // Force a specific width for consistent rendering
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    };

    const periodLabel = (() => {
        try {
            const sDate = parseISO(period);
            return format(sDate, 'MMMM yyyy');
        } catch (e) {
            return period;
        }
    })();

    return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8 animate-fade-in print:p-0 print:bg-white">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        margin: 0;
                        padding: 0;
                    }
                    .payslip-container {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 20px !important;
                        break-inside: avoid;
                    }
                    /* Ensure no elements are split across pages */
                    h1, h2, h3, p, tr, div {
                        break-inside: avoid;
                    }
                }
            `}} />

            {/* Navigation - Hidden on print */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Summary
                </button>
                <div className="flex flex-col items-end gap-2">
                    <button
                        onClick={handleDownload}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2 transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download as PDF
                    </button>
                </div>
            </div>

            {/* Payslip Document */}
            <div ref={payslipRef} className="payslip-container max-w-4xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden print:shadow-none print:rounded-none border border-gray-100">
                {/* Header */}
                <div className="bg-slate-900 p-8 md:p-12 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter mb-1">PAYSCLEEP</h1>
                        <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">Payroll Management System</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold mb-1">PAY ADVICE</h2>
                        <p className="text-slate-400 text-sm font-medium">Period: {periodLabel}</p>
                    </div>
                </div>

                <div className="p-8 md:p-12">
                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Contractor Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-sm text-gray-500 font-medium">Name</span>
                                    <span className="text-sm font-bold text-gray-900">{contractor.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-sm text-gray-500 font-medium">Contractor ID</span>
                                    <span className="text-sm font-bold text-gray-900">{contractor.contractorId}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-sm text-gray-500 font-medium">Email</span>
                                    <span className="text-sm font-medium text-gray-900">{contractor.email || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Payment Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-sm text-gray-500 font-medium">Bank</span>
                                    <span className="text-sm font-bold text-gray-900">{contractor.bankName || 'Common Wealth Bank'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-sm text-gray-500 font-medium">BSB</span>
                                    <span className="text-sm font-bold text-gray-900">{contractor.bsb}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-2">
                                    <span className="text-sm text-gray-500 font-medium">Account Number</span>
                                    <span className="text-sm font-bold text-gray-900">{contractor.accountNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Earnings Section */}
                    <div className="mb-12">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Detailed Earnings Breakdown</h3>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Site & Description</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Hours</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payment.siteBreakdown.map((site, sIdx) => (
                                        <Fragment key={sIdx}>
                                            {/* Site Header Row */}
                                            <tr className="bg-slate-50/30">
                                                <td colSpan={4} className="px-6 py-3 font-black text-xs text-slate-800 border-l-4 border-slate-900 uppercase tracking-wider">
                                                    {site.siteName}
                                                </td>
                                            </tr>

                                            {/* Hourly Breakdown Rows (Skip for releases to avoid double-up) */}
                                            {!site.isRelease && site.hoursByType && Object.entries(site.hoursByType).map(([type, hrs], tIdx) => (
                                                hrs > 0 && (
                                                    <tr key={tIdx} className="hover:bg-gray-50/50 transition">
                                                        <td className="px-8 py-3 text-sm text-gray-600 capitalize">
                                                            {type.replace(/([A-Z])/g, ' $1')} Hours
                                                        </td>
                                                        <td className="px-6 py-3 text-center text-xs font-bold text-gray-500">
                                                            ${(site.rates?.[type] || 0).toFixed(2)} / hr
                                                        </td>
                                                        <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                                                            {hrs.toFixed(1)}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-sm font-black text-gray-900">
                                                            ${(hrs * (site.rates?.[type] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                )
                                            ))}

                                            {/* Training Release Row (Included) */}
                                            {site.isRelease && (
                                                <tr className="bg-blue-50/10">
                                                    <td className="px-8 py-3 text-sm text-blue-700 font-bold uppercase tracking-tight">Training Pay (Released)</td>
                                                    <td className="px-6 py-3 text-center text-xs font-bold text-blue-600">
                                                        {site.hours > 0 ? `$${(site.pay / site.hours).toFixed(2)} / hr` : '—'}
                                                    </td>
                                                    <td className="px-6 py-3 text-center text-sm font-bold text-blue-700">
                                                        {site.hours > 0 ? site.hours.toFixed(1) : '—'}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-sm font-black text-blue-900">${site.pay.toFixed(2)}</td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}

                                    {/* Subtotal Row */}
                                    <tr className="bg-slate-900 text-white">
                                        <td className="px-6 py-4 font-black uppercase text-xs tracking-tighter">Gross Earnings Total</td>
                                        <td className="px-6 py-4 text-center"></td>
                                        <td className="px-6 py-4 text-center font-black">{payment.totalHours.toFixed(1)}h Total</td>
                                        <td className="px-6 py-4 text-right font-black text-lg">${payment.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Adjustments & Deductions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Adjustments</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <span className="text-sm font-medium text-gray-600">Allowances</span>
                                    <span className="text-sm font-bold text-green-600">+${payment.totalAllowance.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <span className="text-sm font-medium text-gray-600">Other Pay</span>
                                    <span className="text-sm font-bold text-green-600">+${payment.totalOtherPay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Deductions</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center bg-rose-50 p-3 rounded-xl border border-rose-100">
                                    <span className="text-sm font-medium text-rose-700 font-bold">Total Deductions</span>
                                    <span className="text-sm font-black text-rose-600">-${payment.totalDeduction.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="flex flex-col md:flex-row justify-end items-center gap-8 mt-16 pt-12 border-t-2 border-dashed border-gray-100">
                        <div className="text-center md:text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2 text-emerald-600">Total Net Payable</p>
                            <div className="text-6xl font-black text-slate-900 tracking-tighter">
                                ${payment.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="mt-20 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 leading-relaxed italic text-center">
                            This is a computer-generated document. No signature is required. For any discrepancies, please contact the payroll department at info@payscleep.com
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payslip;
