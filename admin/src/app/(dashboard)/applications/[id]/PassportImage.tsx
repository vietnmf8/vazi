"use client"

import React, { useState } from "react"
import { X } from "lucide-react"

interface PassportImageProps {
  src: string
  alt: string
  className?: string
}

export function PassportImage({ src, alt, className = "" }: PassportImageProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`object-cover rounded cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setPreviewImage(src)}
      />
      
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
