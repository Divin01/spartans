# EMS API Response & Data Formats - Quick Reference

## 📋 All APIs Summary Table

| # | Endpoint | Method | Purpose | Request | Response | Controller | Line |
|---|----------|--------|---------|---------|----------|-----------|------|
| 1 | `/api/auth/register` | POST | Register user | RegisterDto | AuthResponseDto | AuthController | 21 |
| 2 | `/api/auth/login` | POST | Login user | LoginDto | AuthResponseDto | AuthController | 27 |
| 3 | `/api/auth/refresh` | POST | Refresh token | RefreshTokenDto | AuthResponseDto | AuthController | 33 |
| 4 | `/api/auth/logout` | POST | Logout | LogoutDto | Message | AuthController | 39 |
| 5 | `/api/organizations` | GET | List all orgs | - | OrganizationDto[] | OrganizationsController | 27 |
| 6 | `/api/organizations/{id}` | GET | Get org | - | OrganizationDto | OrganizationsController | 47 |
| 7 | `/api/organizations` | POST | Create org | CreateOrganizationDto | OrganizationDto | OrganizationsController | 61 |
| 8 | `/api/organizations/{id}` | PUT | Update org | UpdateOrganizationDto | OrganizationDto | OrganizationsController | 93 |
| 9 | `/api/venues` | GET | List all venues | - | VenueDto[] | VenuesController | 26 |
| 10 | `/api/venues/{id}` | GET | Get venue | - | VenueDto | VenuesController | 50 |
| 11 | `/api/venues` | POST | Create venue | CreateVenueDto | VenueDto | VenuesController | 67 |
| 12 | `/api/events` | GET | List all events | - | EventDto[] | EventsController | 26 |
| 13 | `/api/events/{id}` | GET | Get event | - | EventDto | EventsController | 53 |
| 14 | `/api/events` | POST | Create event | CreateEventDto | EventDto | EventsController | 80 |

---

## 🔐 Authentication APIs

### 1. POST /api/auth/register
**Location**: `EMS.Presentation/Controllers/AuthController.cs` Line 21

**Request** (RegisterDto):

{ fullName, email, password, role }

**Response** (AuthResponseDto):

{ accessToken, refreshToken, message }

**DTO Location**: `EMS.BusinessLogic/DTOs/AuthDtos.cs` Lines 4, 50

---

### 2. POST /api/auth/login
**Location**: `EMS.Presentation/Controllers/AuthController.cs` Line 27

**Request** (LoginDto):

{ email, password }

**Response** (AuthResponseDto):

{ accessToken, refreshToken, message }

**DTO Location**: `EMS.BusinessLogic/DTOs/AuthDtos.cs` Lines 12, 50

---

### 3. POST /api/auth/refresh
**Location**: `EMS.Presentation/Controllers/AuthController.cs` Line 33

**Request** (RefreshTokenDto):

{ accessToken, refreshToken }

**Response** (AuthResponseDto):

{ accessToken, refreshToken, message }

**DTO Location**: `EMS.BusinessLogic/DTOs/AuthDtos.cs` Lines 19, 50

---

### 4. POST /api/auth/logout
**Location**: `EMS.Presentation/Controllers/AuthController.cs` Line 39

**Request** (LogoutDto):

{ token }

**Response**:

{ message: "Logged out successfully." }

**DTO Location**: `EMS.BusinessLogic/DTOs/AuthDtos.cs` Line 26

---

## 🏢 Organization APIs

### 5. GET /api/organizations
**Location**: `EMS.Presentation/Controllers/OrganizationsController.cs` Line 27

**Response** (OrganizationDto[]):

[{ id, name, type, taxId, phone, email, website, addressLine1, addressLine2, city, state, zipCode, country, verified, verifiedBy, verifiedAt, logoUrl, createdAt, updatedAt }]

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Line 44

---

### 6. GET /api/organizations/{id}
**Location**: `EMS.Presentation/Controllers/OrganizationsController.cs` Line 47

**Response** (OrganizationDto):

{ id, name, type, taxId, phone, email, website, addressLine1, addressLine2, city, state, zipCode, country, verified, verifiedBy, verifiedAt, logoUrl, createdAt, updatedAt }

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Line 44

---

### 7. POST /api/organizations
**Location**: `EMS.Presentation/Controllers/OrganizationsController.cs` Line 61

**Request** (CreateOrganizationDto):

{ name, type, taxId, phone, email, website, addressLine1, addressLine2, city, state, zipCode, country, logoUrl }

**Response** (OrganizationDto):

Same as GET + auto-generated id, createdAt, updatedAt

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Lines 7, 44

---

### 8. PUT /api/organizations/{id}
**Location**: `EMS.Presentation/Controllers/OrganizationsController.cs` Line 93

**Request** (UpdateOrganizationDto - all optional):

{ name?, type?, phone?, email?, website?, addressLine1?, addressLine2?, city?, state?, zipCode?, logoUrl? }

**Response** (OrganizationDto):

Updated organization with all fields

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Lines 28, 44

---

## 🏛️ Venue APIs

### 9. GET /api/venues
**Location**: `EMS.Presentation/Controllers/VenuesController.cs` Line 26

**Response** (VenueDto[]):

[{ id, name, description, addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, capacity, parkingCapacity, accessibility, hasPower, hasWifi, hasRestrooms, outdoor, covered, contactName, contactPhone, contactEmail, createdAt, updatedAt }]

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Line 105

---

### 10. GET /api/venues/{id}
**Location**: `EMS.Presentation/Controllers/VenuesController.cs` Line 50

**Response** (VenueDto):

{ id, name, description, addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, capacity, parkingCapacity, accessibility, hasPower, hasWifi, hasRestrooms, outdoor, covered, contactName, contactPhone, contactEmail, createdAt, updatedAt }

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Line 105

---

### 11. POST /api/venues
**Location**: `EMS.Presentation/Controllers/VenuesController.cs` Line 67

**Request** (CreateVenueDto):

{ name, description, addressLine1, addressLine2, city, state, zipCode, country, latitude, longitude, capacity, parkingCapacity, accessibility, hasPower, hasWifi, hasRestrooms, outdoor, covered, contactName, contactPhone, contactEmail }

**Response** (VenueDto):

Same as GET + auto-generated id, createdAt, updatedAt

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Lines 73, 105

---

## 📅 Event APIs

### 12. GET /api/events
**Location**: `EMS.Presentation/Controllers/EventsController.cs` Line 26

**Query Params**: `status?` (optional filter)

**Response** (EventDto[]):

[{ id, organizerId, organizerName, venueId, venueName, name, description, eventType, startDate, endDate, crowdSize, actualAttendance, venueType, indoor, alcohol, minimumAge, status, riskLevel, timezone, createdAt, updatedAt, publishedAt, cancelledAt, cancellationReason }]

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Line 141

---

### 13. GET /api/events/{id}
**Location**: `EMS.Presentation/Controllers/EventsController.cs` Line 53

**Response** (EventDto):

{ id, organizerId, organizerName, venueId, venueName, name, description, eventType, startDate, endDate, crowdSize, actualAttendance, venueType, indoor, alcohol, minimumAge, status, riskLevel, timezone, createdAt, updatedAt, publishedAt, cancelledAt, cancellationReason }

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Line 141

---

### 14. POST /api/events
**Location**: `EMS.Presentation/Controllers/EventsController.cs` Line 80

**Request** (CreateEventDto):

{ organizerId, venueId?, name, description, eventType, startDate, endDate, crowdSize, venueName, venueType, indoor, alcohol, minimumAge, riskLevel, timezone }

**Response** (EventDto):

Same as GET + auto-generated id, createdAt, updatedAt

**Validations**: Organizer and Venue must exist

**DTO Location**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs` Lines 129, 136, 141

---

## 📂 DTO File Quick Reference

**File**: `EMS.BusinessLogic/DTOs/AuthDtos.cs`
- RegisterDto (Line 4)
- LoginDto (Line 12)
- RefreshTokenDto (Line 19)
- LogoutDto (Line 26)
- AuthResponseDto (Line 50)

**File**: `EMS.BusinessLogic/DTOs/EventManagementDtos.cs`
- CreateOrganizationDto (Line 7)
- UpdateOrganizationDto (Line 28)
- OrganizationDto (Line 44)
- CreateVenueDto (Line 73)
- VenueDto (Line 105)
- CreateEventDto (Line 129)
- UpdateEventDto (Line 136)
- EventDto (Line 141)

---

## 📍 Controller File Quick Reference

| Controller | Path | Purpose |
|-----------|------|---------|
| AuthController | `EMS.Presentation/Controllers/AuthController.cs` | Auth APIs (register, login, refresh, logout) |
| OrganizationsController | `EMS.Presentation/Controllers/OrganizationsController.cs` | Organization CRUD |
| VenuesController | `EMS.Presentation/Controllers/VenuesController.cs` | Venue CRUD |
| EventsController | `EMS.Presentation/Controllers/EventsController.cs` | Event CRUD |

---

## ✅ HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET/PUT |
| 201 | Successful POST (Created) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (auth failed) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Server Error |

---

**Version**: 1.0 | **Project**: EMS Backend | **Branch**: Daniel-DatabaseSchema