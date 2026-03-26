// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SiteBreakdown {
    siteName: string;
    netPay: number;
}

interface PayslipRequest {
    to: string;
    contractorName: string;
    period: string;
    totalNetPay: number;
    siteBreakdown: SiteBreakdown[];
    pdfAttachment?: string;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not set in environment variables')
        }

        const { to, contractorName, period, totalNetPay, siteBreakdown, pdfAttachment } = await req.json() as PayslipRequest

        if (!to) {
            throw new Error('No recipient email provided')
        }

        console.log(`Sending email to ${to} for ${contractorName} with PDF: ${!!pdfAttachment}`);

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Payslip Payroll <onboarding@resend.dev>', // Default Resend test email
                to: [to],
                subject: `Payslip Advice - ${contractorName} - ${period}`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #0f172a; margin: 0; letter-spacing: -1px;">PAYSLIP</h1>
              <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Pay Advice</p>
            </div>

            <p>Hi ${contractorName},</p>
            <p>Your payment summary for <strong>${period}</strong> is ready. Please find your detailed payslip attached as a PDF.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold;">Total Net Payable</p>
                <h1 style="margin: 8px 0; color: #059669; font-size: 32px;">$${totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h1>
            </div>

            <h3 style="color: #1e293b; font-size: 14px; margin-bottom: 12px;">Quick Summary:</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
                        <th style="padding: 10px 0; color: #64748b; font-size: 11px; text-transform: uppercase;">Site</th>
                        <th style="padding: 10px 0; color: #64748b; font-size: 11px; text-transform: uppercase; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${siteBreakdown.map((s: SiteBreakdown) => `
                        <tr style="border-bottom: 1px dotted #e2e8f0;">
                            <td style="padding: 12px 0; color: #334155; font-size: 13px;">${s.siteName}</td>
                            <td style="padding: 12px 0; color: #0f172a; font-size: 13px; text-align: right; font-weight: bold;">$${s.netPay.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
                This is a secure automated pay advice. Please log in to your portal to view full details.<br/>
                For support, contact <strong>payroll@payslip.com</strong>
              </p>
            </div>
          </div>
        `,
                attachments: pdfAttachment ? [
                    {
                        filename: `Payslip - ${contractorName} - ${period}.pdf`,
                        content: pdfAttachment,
                    }
                ] : []
            }),
        })

        const data = await res.json()
        console.log('Resend Response:', data);

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error: any) {
        console.error('Edge Function Error:', error.message || error);
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
