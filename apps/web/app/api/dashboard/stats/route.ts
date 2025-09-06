import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/clients/server-client';
import { requireAuthContext } from '~/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { tenant } = await requireAuthContext();
    const supabase = getSupabaseServerClient();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    
    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    
    // Get total invoice counts and amounts
    const { data: totalStats } = await supabase
      .from('invoices')
      .select('id, total_amount, confidence_score, created_at, status')
      .eq('tenant_id', tenant.id)
      .gte('created_at', startDateStr);
    
    const totalInvoices = totalStats?.length || 0;
    const processedToday = totalStats?.filter(inv => 
      inv.created_at.startsWith(today)
    ).length || 0;
    
    const totalAmount = totalStats?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
    const avgInvoiceAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
    const averageConfidence = totalStats?.length 
      ? totalStats.reduce((sum, inv) => sum + inv.confidence_score, 0) / totalStats.length
      : 0;
    
    // Calculate success rate (approved / total processed)
    const processedInvoices = totalStats?.filter(inv => 
      ['approved', 'rejected'].includes(inv.status)
    ) || [];
    const approvedInvoices = totalStats?.filter(inv => inv.status === 'approved') || [];
    const successRate = processedInvoices.length > 0 
      ? approvedInvoices.length / processedInvoices.length 
      : 1;
    
    // Get processing jobs for timing metrics
    const { data: processingJobs } = await supabase
      .from('processing_jobs')
      .select('created_at, finished_at, status')
      .eq('tenant_id', tenant.id)
      .not('finished_at', 'is', null)
      .gte('created_at', startDateStr);
    
    // Calculate average processing time in minutes
    const completedJobs = processingJobs?.filter(job => job.finished_at) || [];
    const averageProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => {
          const start = new Date(job.created_at).getTime();
          const end = new Date(job.finished_at!).getTime();
          return sum + (end - start) / (1000 * 60); // Convert to minutes
        }, 0) / completedJobs.length
      : 0;
    
    // Get review metrics
    const pendingReview = totalStats?.filter(inv => 
      inv.status === 'ready_for_review' && inv.confidence_score < 0.85
    ).length || 0;
    
    const approvedToday = totalStats?.filter(inv => 
      inv.status === 'approved' && inv.created_at.startsWith(today)
    ).length || 0;
    
    const rejectedToday = totalStats?.filter(inv => 
      inv.status === 'rejected' && inv.created_at.startsWith(today)
    ).length || 0;
    
    // Get tax calculation totals
    const { data: taxStats } = await supabase
      .from('tax_calculations')
      .select('total_tax_amount, total_retention_amount')
      .eq('invoice_id', 'in', `(${totalStats?.map(inv => `'${inv.id}'`).join(',') || 'NULL'})`);
    
    const totalTaxes = taxStats?.reduce((sum, tax) => sum + tax.total_tax_amount, 0) || 0;
    const totalRetentions = taxStats?.reduce((sum, tax) => sum + tax.total_retention_amount, 0) || 0;
    
    // Get status distribution
    const statusCounts = totalStats?.reduce((acc: Record<string, number>, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {}) || {};
    
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalInvoices) * 100,
    }));
    
    // Get recent invoices
    const { data: recentInvoices } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        supplier_name,
        total_amount,
        status,
        confidence_score,
        created_at
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Generate monthly trends (simplified)
    const monthlyData = [];
    for (let i = 2; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date();
      monthEnd.setMonth(monthEnd.getMonth() - i + 1);
      monthEnd.setDate(0);
      
      const monthInvoices = totalStats?.filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate >= monthStart && invDate <= monthEnd;
      }) || [];
      
      const monthAmount = monthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('es-CO', { month: 'short' }),
        invoices: monthInvoices.length,
        amount: monthAmount,
      });
    }
    
    const dashboardStats = {
      // Processing metrics
      totalInvoices,
      processedToday,
      averageProcessingTime: Math.round(averageProcessingTime),
      successRate,
      
      // Financial metrics
      totalAmount,
      totalTaxes,
      totalRetentions,
      avgInvoiceAmount,
      
      // Review metrics
      pendingReview,
      approvedToday,
      rejectedToday,
      averageConfidence,
      
      // Recent activity
      recentInvoices: recentInvoices || [],
      
      // Status distribution
      statusDistribution,
      
      // Monthly trends
      monthlyData,
    };
    
    return NextResponse.json({
      data: dashboardStats,
      period,
      generatedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}