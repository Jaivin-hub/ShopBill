# ShopBill PWA - Folder Structure

## New Improved Structure

```
shopbill-pwa/
├── src/
│   ├── components/          # React components (organized by feature)
│   │   ├── auth/           # Authentication components
│   │   │   ├── Login.jsx
│   │   │   ├── SignupComponent.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   └── StaffSetPassword.jsx
│   │   ├── common/         # Shared/reusable components
│   │   │   ├── Header.jsx
│   │   │   ├── NotificationToast.jsx
│   │   │   ├── ConfirmationModal.jsx
│   │   │   ├── SettingItem.jsx
│   │   │   ├── ToggleSwitch.jsx
│   │   │   └── StatCard.jsx
│   │   ├── dashboard/      # Dashboard components
│   │   │   ├── Dashboard.jsx
│   │   │   └── superAdminDashboard.jsx
│   │   ├── inventory/      # Inventory management
│   │   │   ├── InventoryManager.jsx
│   │   │   ├── InventoryContent.jsx
│   │   │   ├── ScannerModal.jsx
│   │   │   └── BarcodeScannerModal.jsx
│   │   ├── sales/          # Sales & Billing
│   │   │   ├── BillingPOS.jsx
│   │   │   ├── SalesActivityPage.jsx
│   │   │   └── SalesChart.jsx
│   │   ├── customers/      # Customer management
│   │   │   ├── CustomerList.jsx
│   │   │   └── Ledger.jsx
│   │   ├── reports/        # Reports
│   │   │   ├── Reports.jsx
│   │   │   └── GlobalReport.jsx
│   │   ├── settings/       # Settings & Configuration
│   │   │   ├── Settings.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── PlanUpgrade.jsx
│   │   │   ├── StaffPermissionsManager.jsx
│   │   │   ├── ChangePasswordForm.jsx
│   │   │   ├── SystemConfig.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── notifications/  # Notifications
│   │   │   └── NotificationsPage.jsx
│   │   └── landing/        # Landing pages
│   │       └── LandingPage.jsx
│   │
│   ├── services/           # API service layer
│   │   └── api/
│   │       ├── index.js              # Central export
│   │       ├── authService.js        # Authentication APIs
│   │       ├── inventoryService.js   # Inventory APIs
│   │       ├── salesService.js       # Sales APIs
│   │       ├── customersService.js   # Customer APIs
│   │       ├── reportsService.js     # Reports APIs
│   │       ├── staffService.js       # Staff APIs
│   │       ├── superadminService.js  # Superadmin APIs
│   │       └── userService.js        # User/Plan APIs
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useApi.js       # API call hook with loading/error
│   │   └── useDebounce.js  # Debounce hook for search
│   │
│   ├── lib/                # Core libraries
│   │   └── apiClient.js    # Centralized axios instance with caching
│   │
│   ├── contexts/           # React contexts
│   │   └── ApiContext.jsx  # API context provider
│   │
│   ├── utils/              # Utility functions
│   │   ├── constants.js   # App constants
│   │   └── format.js      # Formatting utilities
│   │
│   ├── config/             # Configuration files
│   │   └── api.js         # API endpoints configuration
│   │
│   ├── assets/             # Static assets
│   │
│   ├── App.jsx             # Main app component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
│
└── public/                 # Public assets
```

## Key Improvements

### 1. **Service Layer** (`services/api/`)
- Organized API calls by domain
- Centralized error handling
- Easy to test and maintain
- Type-safe API calls

### 2. **Centralized API Client** (`lib/apiClient.js`)
- Request caching (30s default)
- Duplicate request cancellation
- Automatic token injection
- Error handling
- Performance optimizations

### 3. **Custom Hooks** (`hooks/`)
- `useApi`: Simplified API calls with loading/error states
- `useDebounce`: Optimize search inputs
- Automatic cleanup and cancellation

### 4. **Component Organization**
- Grouped by feature/domain
- Easier to find and maintain
- Better code organization

### 5. **Performance Optimizations**
- Request caching reduces API calls
- Duplicate request prevention
- Debounced search inputs
- Parallel API calls support

## Usage Examples

### Using Services
```javascript
import { inventoryService } from '../services/api';

// In component
const fetchInventory = async () => {
  const data = await inventoryService.getAll();
  // Use data
};
```

### Using useApi Hook
```javascript
import { useApi } from '../hooks/useApi';
import { inventoryService } from '../services/api';

function MyComponent() {
  const { data, loading, error, refetch } = useApi(
    () => inventoryService.getAll(),
    [] // dependencies
  );

  if (loading) return <Loader />;
  if (error) return <Error />;
  return <DataDisplay data={data} />;
}
```

### Using Debounced Search
```javascript
import { useDebounce } from '../hooks/useDebounce';
import { inventoryService } from '../services/api';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch) {
      // API call only after 300ms of no typing
      inventoryService.search(debouncedSearch);
    }
  }, [debouncedSearch]);
}
```

## Migration Guide

1. Replace direct `apiClient` usage with service functions
2. Use `useApi` hook for data fetching in components
3. Move components to appropriate feature folders
4. Update imports accordingly

