#!/bin/bash

# Migration script to move components to new folder structure
# Run this from the shopbill-pwa directory

echo "🚀 Starting component migration..."

# Create directories if they don't exist
mkdir -p src/components/{auth,common,dashboard,inventory,sales,customers,reports,settings,notifications,landing}

# Auth components
echo "Moving auth components..."
mv src/components/Login.jsx src/components/auth/ 2>/dev/null || echo "Login.jsx already moved or not found"
mv src/components/SignupComponent.jsx src/components/auth/ 2>/dev/null || echo "SignupComponent.jsx already moved or not found"
mv src/components/ResetPassword.jsx src/components/auth/ 2>/dev/null || echo "ResetPassword.jsx already moved or not found"
mv src/components/StaffSetPassword.jsx src/components/auth/ 2>/dev/null || echo "StaffSetPassword.jsx already moved or not found"

# Common components
echo "Moving common components..."
mv src/components/Header.jsx src/components/common/ 2>/dev/null || echo "Header.jsx already moved or not found"
mv src/components/NotificationToast.jsx src/components/common/ 2>/dev/null || echo "NotificationToast.jsx already moved or not found"
mv src/components/ConfirmationModal.jsx src/components/common/ 2>/dev/null || echo "ConfirmationModal.jsx already moved or not found"
mv src/components/SettingItem.jsx src/components/common/ 2>/dev/null || echo "SettingItem.jsx already moved or not found"
mv src/components/ToggleSwitch.jsx src/components/common/ 2>/dev/null || echo "ToggleSwitch.jsx already moved or not found"
mv src/components/StatCard.jsx src/components/common/ 2>/dev/null || echo "StatCard.jsx already moved or not found"

# Dashboard components
echo "Moving dashboard components..."
mv src/components/Dashboard.jsx src/components/dashboard/ 2>/dev/null || echo "Dashboard.jsx already moved or not found"
mv src/components/superAdminDashboard.jsx src/components/dashboard/ 2>/dev/null || echo "superAdminDashboard.jsx already moved or not found"

# Inventory components
echo "Moving inventory components..."
mv src/components/InventoryManager.jsx src/components/inventory/ 2>/dev/null || echo "InventoryManager.jsx already moved or not found"
mv src/components/InventoryContent.jsx src/components/inventory/ 2>/dev/null || echo "InventoryContent.jsx already moved or not found"
mv src/components/ScannerModal.jsx src/components/inventory/ 2>/dev/null || echo "ScannerModal.jsx already moved or not found"
mv src/components/BarcodeScannerModal.jsx src/components/inventory/ 2>/dev/null || echo "BarcodeScannerModal.jsx already moved or not found"

# Sales components
echo "Moving sales components..."
mv src/components/BillingPOS.jsx src/components/sales/ 2>/dev/null || echo "BillingPOS.jsx already moved or not found"
mv src/components/SalesActivityPage.jsx src/components/sales/ 2>/dev/null || echo "SalesActivityPage.jsx already moved or not found"
mv src/components/SalesChart.jsx src/components/sales/ 2>/dev/null || echo "SalesChart.jsx already moved or not found"

# Customer components
echo "Moving customer components..."
mv src/components/CustomerList.jsx src/components/customers/ 2>/dev/null || echo "CustomerList.jsx already moved or not found"
mv src/components/Ledger.jsx src/components/customers/ 2>/dev/null || echo "Ledger.jsx already moved or not found"
mv src/components/PaymentModal.jsx src/components/customers/ 2>/dev/null || echo "PaymentModal.jsx already moved or not found"

# Reports components
echo "Moving reports components..."
mv src/components/Reports.jsx src/components/reports/ 2>/dev/null || echo "Reports.jsx already moved or not found"
mv src/components/GlobalReport.jsx src/components/reports/ 2>/dev/null || echo "GlobalReport.jsx already moved or not found"

# Settings components
echo "Moving settings components..."
mv src/components/Settings.jsx src/components/settings/ 2>/dev/null || echo "Settings.jsx already moved or not found"
mv src/components/Profile.jsx src/components/settings/ 2>/dev/null || echo "Profile.jsx already moved or not found"
mv src/components/PlanUpgrade.jsx src/components/settings/ 2>/dev/null || echo "PlanUpgrade.jsx already moved or not found"
mv src/components/StaffPermissionsManager.jsx src/components/settings/ 2>/dev/null || echo "StaffPermissionsManager.jsx already moved or not found"
mv src/components/ChangePasswordForm.jsx src/components/settings/ 2>/dev/null || echo "ChangePasswordForm.jsx already moved or not found"
mv src/components/SystemConfig.jsx src/components/settings/ 2>/dev/null || echo "SystemConfig.jsx already moved or not found"
mv src/components/UserManagement.jsx src/components/settings/ 2>/dev/null || echo "UserManagement.jsx already moved or not found"

# Notifications
echo "Moving notifications..."
mv src/components/NotificationsPage.jsx src/components/notifications/ 2>/dev/null || echo "NotificationsPage.jsx already moved or not found"

# Landing
echo "Moving landing..."
mv src/components/LandingPage.jsx src/components/landing/ 2>/dev/null || echo "LandingPage.jsx already moved or not found"

echo "✅ Component migration complete!"
echo "⚠️  Note: You'll need to update import paths in components that reference other components."
echo "📖 See MIGRATION_GUIDE.md for details on updating imports."

