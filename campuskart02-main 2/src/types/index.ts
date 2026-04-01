export interface User {
  uid: string;
  name: string;
  email: string;
  city: string;
  college: string;
  mobile: string;
  bio?: string;
  profilePhoto?: string;
  followers: string[];
  following: string[];
  createdAt: string;
  holidayMode?: {
    isActive: boolean;
    fromDate: string;
    toDate: string;
    activatedAt?: number;
    deactivatedAt?: number;
  };
}

export interface Item {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerCollege: string;
  sellerMobile?: string;
  productName: string;
  productImage: string;
  type: string;
  price: number;
  category: 'gadgets' | 'books' | 'stationary' | 'other';
  condition: 'new' | 'like new' | 'used';
  showMobileNumber: boolean;
  description: string;
  isActive: boolean;
  isSold: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  college: string;
  organizer: string;
  image: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Offer {
  id: string;
  itemId: string;
  buyerId: string;
  buyerName: string;
  offerPrice: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}