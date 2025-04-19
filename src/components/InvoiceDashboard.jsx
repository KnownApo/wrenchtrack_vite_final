import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaHourglass, FaCheckCircle } from 'react-icons/fa';
import { formatCurrency } from '../utils/helpers';

const StatCard = ({ title, value, icon, color, subtitle, subtitleValue }) => {
  return (
    <Card className="mb-3 shadow-sm h-100">
      <Card.Body className="d-flex align-items-center">
        <div className={`rounded-circle p-3 me-3 bg-${color} bg-opacity-10`}>
          {icon}
        </div>
        <div>
          <h6 className="text-muted mb-1">{title}</h6>
          <h4 className="fw-bold mb-0">{value}</h4>
          {subtitle && (
            <div className="text-muted small mt-1">
              {subtitle}: {subtitleValue}
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

const InvoiceDashboard = ({ stats }) => {
  if (!stats) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col md={3}>
          <StatCard
            title="Total Billed"
            value={formatCurrency(stats.totalBilled)}
            icon={<FaFileInvoiceDollar size={24} className="text-primary" />}
            color="primary"
            subtitle="Invoices"
            subtitleValue={stats.totalInvoices}
          />
        </Col>
        <Col md={3}>
          <StatCard
            title="Completed Unpaid"
            value={formatCurrency(stats.completedUnpaidAmount)}
            icon={<FaCheckCircle size={24} className="text-danger" />}
            color="danger"
            subtitle="Invoices"
            subtitleValue={stats.completedUnpaidCount}
          />
        </Col>
        <Col md={3}>
          <StatCard
            title="Completed Paid"
            value={formatCurrency(stats.completedPaidAmount)}
            icon={<FaMoneyBillWave size={24} className="text-success" />}
            color="success"
            subtitle="Invoices"
            subtitleValue={stats.completedPaidCount}
          />
        </Col>
        <Col md={3}>
          <StatCard
            title="In Progress"
            value={formatCurrency(stats.pendingAmount)}
            icon={<FaHourglass size={24} className="text-warning" />}
            color="warning"
            subtitle="Invoices"
            subtitleValue={stats.pendingCount}
          />
        </Col>
      </Row>
      
      {/* Second row with payment-specific information */}
      <Row className="mt-3">
        <Col md={4}>
          <StatCard
            title="Total Received"
            value={formatCurrency(stats.paidAmount)}
            icon={<FaMoneyBillWave size={24} className="text-success" />}
            color="success"
            subtitle="Payment Rate"
            subtitleValue={stats.totalBilled > 0 ? `${Math.round((stats.paidAmount / stats.totalBilled) * 100)}%` : '0%'}
          />
        </Col>
        <Col md={4}>
          <StatCard
            title="Outstanding Balance"
            value={formatCurrency(stats.unpaidAmount)}
            icon={<FaFileInvoiceDollar size={24} className="text-danger" />}
            color="danger"
            subtitle="Awaiting Payment"
            subtitleValue={`${stats.completedUnpaidCount + stats.pendingCount} invoices`}
          />
        </Col>
        <Col md={4}>
          <StatCard
            title="Avg. Invoice Value"
            value={formatCurrency(stats.totalInvoices > 0 ? stats.totalBilled / stats.totalInvoices : 0)}
            icon={<FaFileInvoiceDollar size={24} className="text-info" />}
            color="info"
            subtitle="Total Invoices"
            subtitleValue={stats.totalInvoices}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default InvoiceDashboard; 