/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 */

/**
 * @typedef {Object} CookingOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 * @property {boolean} isDefault
 */

/**
 * @typedef {Object} BilingualBullet
 * @property {string} nameEn
 * @property {string} nameAr
 */

/**
 * @typedef {Object} MenuItem
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
 * @property {string} category
 * @property {string} image
 * @property {string} descriptionEn
 * @property {string} descriptionAr
 * @property {CookingOption[]} cookingOptions
 * @property {string[]} [availableExtras]   - ids from extrasOptions
 * @property {string[]} [availableSizes]    - ids from sizeOptions
 * @property {Object.<string,number>} [sizeCalories] - kcal per sizeOption id
 * @property {Object.<string,number>} [sizePriceAdd] - extra SAR per size (overrides SizeOption.priceAdd)
 * @property {number} calories              - base kcal (required)
 * @property {BilingualBullet[]} [ingredients]
 * @property {string[]} [allergies]         - ids from allergiesOptions (base item)
 */

/**
 * @typedef {Object} SizeOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 */

/**
 * @typedef {Object} AllergyOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 */

/**
 * @typedef {Object} ExtrasOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
 * @property {number} [calories] - kcal added when this extra is selected
 * @property {string[]} [allergyIds] - ids from allergiesOptions; shown on mobile only when this extra is selected
 */

/**
 * @typedef {Object} OfferItem
 * @property {string} menuItemId
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} qty
 */

/**
 * @typedef {Object} Offer
 * @property {string} id
 * @property {string} titleEn
 * @property {string} titleAr
 * @property {string} descriptionEn
 * @property {string} descriptionAr
 * @property {string} image
 * @property {string} discount
 * @property {number} originalPrice
 * @property {number} offerPrice
 * @property {OfferItem[]} items
 * @property {boolean} isActive
 */

/**
 * @typedef {'pending' | 'preparing' | 'onTheWay' | 'delivered' | 'cancelled'} OrderStatus
 */

/**
 * @typedef {'card' | 'cash'} PaymentMethod
 */

/**
 * @typedef {Object} OrderItemOption
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
 * @property {number} quantity
 * @property {OrderItemOption} [selectedSize]
 * @property {OrderItemOption} [selectedCookingOption]
 * @property {OrderItemOption[]} [selectedExtras]
 * @property {number} subtotal
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} orderNumber
 * @property {string} plateNumber
 * @property {string} carModel
 * @property {string} carColor
 * @property {PaymentMethod} paymentMethod
 * @property {number} [cashAmount]
 * @property {number} [changeAmount]
 * @property {OrderItem[]} items
 * @property {number} total
 * @property {OrderStatus} status
 * @property {string} restaurantId
 * @property {string} [restaurantName]
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} Restaurant
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {string} address
 * @property {string} phone
 * @property {string} logoImage
 * @property {boolean} isActive
 */

/**
 * @typedef {'admin' | 'cashier' | 'user'} UserRole
 */

/**
 * @typedef {Object} AppUser
 * @property {string} uid
 * @property {string} email
 * @property {string} displayName
 * @property {UserRole} role
 * @property {string} [restaurantId]
 * @property {string} [restaurantName]
 * @property {boolean} isActive
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 * @property {string} [createdBy]
 */

/**
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} displayName
 * @property {string | null} zkUserId
 * @property {string | null} [shiftId]
 * @property {number} [startOffsetMinutes] Signed minutes relative to the shift start
 * @property {number} [endOffsetMinutes] Signed minutes relative to the shift end
 * @property {number[]} [weeklyOffDays] JavaScript weekday numbers, Sunday = 0
 * @property {boolean} isActive
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 * @property {string} [demoSeedId] Present only on seeded attendance employees
 */

/**
 * @typedef {Object} ShiftTemplate
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {'prayer'} startType
 * @property {'Fajr' | 'Maghrib'} startPrayer
 * @property {number} startOffsetMinutes
 * @property {'fixed'} endType
 * @property {string} endTime HH:mm in Asia/Riyadh
 * @property {boolean} endNextDay
 * @property {number} graceMinutes
 * @property {boolean} active
 */

/**
 * @typedef {Object} AttendanceSettings
 * @property {number} monthlyLateThresholdMinutes
 * @property {'all_after_threshold'} deductionPolicy
 * @property {'Asia/Riyadh'} timezone
 * @property {{ city: string, country: string }} prayerLocation
 * @property {number} prayerCalculationMethod
 */

/**
 * @typedef {Object} PrayerTime
 * @property {string} date YYYY-MM-DD
 * @property {string} fajr HH:mm
 * @property {string} maghrib HH:mm
 * @property {'aladhan'} source
 * @property {boolean} override
 * @property {string} [overrideReason]
 * @property {string} [adjustedBy]
 */

/**
 * @typedef {Object} AttendanceOverride
 * @property {string} employeeId
 * @property {string} shiftDate YYYY-MM-DD in Asia/Riyadh
 * @property {'manual'} type
 * @property {string} [adjustedFirstPunch] Riyadh local timestamp
 * @property {string} [adjustedLastPunch] Riyadh local timestamp
 * @property {number} [waivedLateMinutes]
 * @property {string} reason
 * @property {string} adjustedBy
 * @property {import('firebase/firestore').Timestamp} adjustedAt
 */

/**
 * @typedef {Object} AttendanceEvent
 * @property {string} id
 * @property {string} deviceSerial
 * @property {string} zkUserId
 * @property {string} eventTimeRaw
 * @property {import('firebase/firestore').Timestamp | null} eventTime
 * @property {number | null} status
 * @property {number | null} verifyType
 * @property {string | null} workCode
 * @property {'zkteco' | 'demo'} source
 * @property {'SenseFace 2A' | 'Synthetic Demo'} deviceModel
 * @property {string} raw
 * @property {import('firebase/firestore').Timestamp} receivedAt
 * @property {string} [demoSeedId] Present only on synthetic attendance events
 */

/**
 * @typedef {Object} AttendanceDevice
 * @property {string} serialNumber
 * @property {'zkteco'} provider
 * @property {'SenseFace 2A'} model
 * @property {import('firebase/firestore').Timestamp} lastSeenAt
 */

/**
 * @typedef {Object} Shift
 * @property {string} id
 * @property {string} userId
 * @property {string} userName
 * @property {string} restaurantId
 * @property {import('firebase/firestore').Timestamp} clockIn
 * @property {import('firebase/firestore').Timestamp} [clockOut]
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} AuditEntry
 * @property {string} status
 * @property {import('firebase/firestore').Timestamp} changedAt
 * @property {string} changedBy
 * @property {string} changedByName
 */

/**
 * @typedef {'en' | 'ar'} Locale
 */

/**
 * @typedef {'ltr' | 'rtl'} Direction
 */

// This file only contains JSDoc type definitions.
// Import types in other files using JSDoc @type comments.
export {};
