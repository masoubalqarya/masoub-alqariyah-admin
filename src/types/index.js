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
 */

/**
 * @typedef {Object} SizeOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} priceAdd
 */

/**
 * @typedef {Object} ExtrasOption
 * @property {string} id
 * @property {string} nameEn
 * @property {string} nameAr
 * @property {number} price
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
