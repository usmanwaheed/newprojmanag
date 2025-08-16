import fetch from 'node-fetch';

export async function extractLinkPreview(url) {
  try {
    if (!url || !isValidUrl(url)) {
      return null;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      timeout: 10000, // 10 second timeout
      size: 1048576, // 1MB limit
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    
    // Extract meta tags
    const title = extractMetaContent(html, [
      'og:title',
      'twitter:title',
      'title'
    ]) || extractTitle(html);
    
    const description = extractMetaContent(html, [
      'og:description',
      'twitter:description',
      'description'
    ]);
    
    const image = extractMetaContent(html, [
      'og:image',
      'twitter:image',
      'twitter:image:src'
    ]);

    // Clean and validate extracted data
    const preview = {
      url: url,
      title: cleanText(title),
      description: cleanText(description),
      image: image && isValidUrl(image) ? image : null
    };

    // Only return preview if we have at least title or description
    if (preview.title || preview.description) {
      return preview;
    }

    return null;
  } catch (error) {
    console.error('Link preview extraction error:', error);
    return null;
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function extractMetaContent(html, properties) {
  for (const property of properties) {
    // Try property="..." first
    let match = html.match(new RegExp(
      `<meta\\s+property=["']${property}["'][^>]*content=["']([^"']+)["']`,
      'i'
    ));
    
    if (!match) {
      // Try name="..." as fallback
      match = html.match(new RegExp(
        `<meta\\s+name=["']${property}["'][^>]*content=["']([^"']+)["']`,
        'i'
      ));
    }
    
    if (!match) {
      // Try reversed order: content first, then property/name
      match = html.match(new RegExp(
        `<meta\\s+content=["']([^"']+)["'][^>]*property=["']${property}["']`,
        'i'
      )) || html.match(new RegExp(
        `<meta\\s+content=["']([^"']+)["'][^>]*name=["']${property}["']`,
        'i'
      ));
    }
    
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1] : null;
}

function cleanText(text) {
  if (!text) return null;
  
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300); // Limit length
}

// server/src/utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function uploadToCloudinary(fileBuffer, options = {}) {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'auto',
        folder: 'chat-files',
        use_filename: true,
        unique_filename: true,
        ...options
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

export async function deleteFromCloudinary(publicId, resourceType = 'auto') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

// server/src/middleware/chat.js
import rateLimit from 'express-rate-limit';

// Rate limiting for chat messages
export const chatMessageRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: {
    success: false,
    message: 'Too many messages sent. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `chat_${req.user._id}`;
  }
});

// Rate limiting for file uploads
export const fileUploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 files per 5 minutes
  message: {
    success: false,
    message: 'Too many file uploads. Please wait before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `upload_${req.user._id}`;
  }
});

// Rate limiting for room creation
export const roomCreationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 rooms per 15 minutes
  message: {
    success: false,
    message: 'Too many rooms created. Please wait before creating more rooms.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `room_create_${req.user._id}`;
  }
});

// Validate chat message content
export function validateMessageContent(content, type = 'text') {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Message content is required' };
  }

  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Message is too long (max 2000 characters)' };
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.)\1{20,}/, // Repeated characters
    /[A-Z]{50,}/, // Too many capitals
    /(https?:\/\/[^\s]+){10,}/ // Too many links
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(trimmed)) {
      return { isValid: false, error: 'Message appears to be spam' };
    }
  }

  return { isValid: true, content: trimmed };
}

// Profanity filter (basic implementation)
export function containsProfanity(text) {
  // This is a basic implementation. In production, you might want to use
  // a more sophisticated profanity filter library
  const profanityWords = [
    // Add your profanity words here
    // Note: This is just an example structure
  ];

  const lowerText = text.toLowerCase();
  return profanityWords.some(word => lowerText.includes(word));
}

// Extract mentions from message content
export function extractMentions(content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Remove duplicates
}

// Format file size for display
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Check if file type is supported
export function isSupportedFileType(mimetype) {
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed'
  ];

  return supportedTypes.includes(mimetype);
}

// Generate unique filename
export function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalName.split('.').pop();
  
  return `${timestamp}_${random}.${extension}`;
}