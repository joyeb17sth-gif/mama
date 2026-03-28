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
                windowWidth: 1100
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    };

    const periodLabel = period; // Expecting the exact string from PaymentSummary

    return (
        <div className="bg-zinc-50 min-h-screen p-8 pt-24 print:p-0 print:bg-white">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4 portrait; margin: 15mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
                    .print-hidden { display: none !important; }
                    .payslip-wrapper { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
                }
            `}} />

            {/* Navigation Header - Fixed at top */}
            <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50 print-hidden">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2.5 text-zinc-500 hover:text-zinc-900 font-bold transition-all text-sm"
                    >
                        <div className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-zinc-50">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </div>
                        Dismiss Preview
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-black transition-all flex items-center gap-2.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Print Container */}
            <div
                ref={payslipRef}
                className="payslip-wrapper max-w-[210mm] mx-auto bg-white p-12 border border-zinc-200 shadow-sm"
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-zinc-900 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 uppercase tracking-tighter mb-2">Payslip</h1>
                        <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest">{periodLabel}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-zinc-900">SitalPayslip</div>
                        <div className="text-xs text-zinc-500 font-medium mt-1">
                            Infrastructure Services<br />
                            ABN: 12 345 678 901
                        </div>
                    </div>
                </div>

                {/* Employee Info Grid */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Employee Details</h3>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">Name</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">{contractor.name}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">ID</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">{contractor.contractorId}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">Role</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">{contractor.role || 'Contractor'}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">Email</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">{contractor.email}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Payment Details</h3>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">Date</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">{format(new Date(), 'dd MMM yyyy')}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">Bank</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">{contractor.bsb || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase text-left">Account</span>
                                <span className="col-span-2 text-sm font-bold text-zinc-900">****{contractor.accountNumber ? contractor.accountNumber.slice(-4) : '****'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Earnings Table */}
                <div className="mb-12">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-4">Earnings Description</h3>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-zinc-100">
                                <th className="py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider w-1/2">Description</th>
                                <th className="py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Rate</th>
                                <th className="py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Hours</th>
                                <th className="py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-zinc-900">
                            {payment.siteBreakdown.map((site, sIdx) => (
                                <Fragment key={sIdx}>
                                    <tr className="border-b border-zinc-50 bg-zinc-50/50">
                                        <td colSpan={4} className="py-2 px-2 font-bold text-xs uppercase tracking-wide">
                                            {site.siteName}
                                        </td>
                                    </tr>
                                    {!site.isRelease && site.hoursByType && Object.entries(site.hoursByType).map(([type, hrs], tIdx) => (
                                        hrs > 0 && (
                                            <tr key={tIdx} className="border-b border-zinc-50">
                                                <td className="py-3 pl-6 text-zinc-600 capitalize">{type.replace(/([A-Z])/g, ' $1')} Rate</td>
                                                <td className="py-3 text-center text-zinc-500">${(site.rates?.[type] || 0).toFixed(2)}</td>
                                                <td className="py-3 text-center">{hrs.toFixed(2)}</td>
                                                <td className="py-3 text-right font-bold">${(hrs * (site.rates?.[type] || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )
                                    ))}
                                    {site.isRelease && (
                                        <tr className="border-b border-zinc-50">
                                            <td className="py-3 pl-6 text-zinc-600">Training Escrow Release</td>
                                            <td className="py-3 text-center text-zinc-500">-</td>
                                            <td className="py-3 text-center">{site.hours > 0 ? site.hours.toFixed(2) : '-'}</td>
                                            <td className="py-3 text-right font-bold">${site.pay.toFixed(2)}</td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Adjustments & Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/2 space-y-3">
                        {/* Totals Block */}
                        <div className="space-y-2 border-t border-zinc-100 pt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500 font-medium">Gross Earnings</span>
                                <span className="font-bold text-zinc-900">${payment.totalPay.toFixed(2)}</span>
                            </div>

                            {(payment.totalAllowance > 0 || payment.totalOtherPay > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 font-medium">Allowances & Bonuses</span>
                                    <span className="font-bold text-zinc-900">+${(payment.totalAllowance + payment.totalOtherPay).toFixed(2)}</span>
                                </div>
                            )}

                            {payment.totalDeduction > 0 && (
                                <div className="flex justify-between text-sm text-rose-600">
                                    <span className="font-medium">Deductions</span>
                                    <span className="font-bold">-${payment.totalDeduction.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center border-t-2 border-zinc-900 pt-4 mt-4">
                                <span className="text-base font-bold text-zinc-900 uppercase tracking-widest">Net Pay</span>
                                <span className="text-3xl font-bold text-zinc-900 tracking-tighter">${payment.totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-zinc-200 pt-8 text-center">
                    <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
                        Payment authorized by SitalPayslip. Funds should appear in your nominated account within 1-2 business days.
                        Questions? Contact support@sitalpayslip.com
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Payslip;
