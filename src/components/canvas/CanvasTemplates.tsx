/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANVAS TEMPLATES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * مكتبة templates جاهزة للبدء السريع
 * مثل نظام Claude Canvas
 * 
 * @version 1.0.0
 */

'use client';

import { useCanvasStore } from '@/store/canvasStore';
import { FileCode, Layout, Database, Server, Palette, X } from 'lucide-react';

interface Template
{
    id: string;
    name: string;
    description: string;
    language: string;
    content: string;
    icon: typeof FileCode;
    category: 'component' | 'api' | 'schema' | 'ui';
}

const TEMPLATES: Template[] = [
    {
        id: 'react-component',
        name: 'React Component',
        description: 'مكون React TypeScript أساسي',
        language: 'typescript',
        category: 'component',
        icon: FileCode,
        content: `import React from 'react';

interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
}

export const UserCard: React.FC<UserCardProps> = ({ name, email, avatar }) => {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {avatar && (
        <img 
          src={avatar} 
          alt={name}
          className="w-16 h-16 rounded-full mb-4"
        />
      )}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
        {name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {email}
      </p>
    </div>
  );
};`,
    },
    {
        id: 'nextjs-api',
        name: 'Next.js API Route',
        description: 'API route مع TypeScript',
        language: 'typescript',
        category: 'api',
        icon: Server,
        content: `import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  name: string;
  email: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'ID is required' },
      { status: 400 }
    );
  }

  // Fetch data logic here
  const data = { id, name: 'Example User', email: 'user@example.com' };

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Create logic here
    const result = { id: Date.now(), ...body };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}`,
    },
    {
        id: 'typescript-interface',
        name: 'TypeScript Interface',
        description: 'واجهة TypeScript للبيانات',
        language: 'typescript',
        category: 'schema',
        icon: Database,
        content: `/**
 * User Data Interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  role: UserRole;
  metadata?: UserMetadata;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export interface UserMetadata {
  lastLogin?: Date;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export type UsersResponse = ApiResponse<User[]>;
export type UserResponse = ApiResponse<User>;`,
    },
    {
        id: 'tailwind-card',
        name: 'Tailwind UI Card',
        description: 'بطاقة UI جاهزة مع Tailwind',
        language: 'tsx',
        category: 'ui',
        icon: Palette,
        content: `export default function ProductCard() {
  return (
    <div className="max-w-sm rounded-lg overflow-hidden shadow-lg bg-white dark:bg-gray-800 transition-transform hover:scale-105">
      <img 
        className="w-full h-48 object-cover"
        src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800" 
        alt="Product"
      />
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200 px-3 py-1 rounded-full">
            New
          </span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            $299
          </span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Premium Headphones
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Experience crystal-clear sound with our premium wireless headphones
          featuring active noise cancellation.
        </p>
        <div className="flex gap-2">
          <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Buy Now
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}`,
    },
    {
        id: 'database-schema',
        name: 'Database Schema',
        description: 'Schema قاعدة بيانات SQL',
        language: 'sql',
        category: 'schema',
        icon: Database,
        content: `-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Posts Table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments Table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);`,
    },
];

interface CanvasTemplatesProps
{
    onClose: () => void;
}

export function CanvasTemplates ( { onClose }: CanvasTemplatesProps )
{
    const { openCanvas } = useCanvasStore();

    const handleUseTemplate = ( template: Template ) =>
    {
        openCanvas( {
            id: `canvas_${ Date.now() }`,
            title: template.name,
            type: 'CODE',
            language: template.language,
            initialContent: template.content,
        } );
        onClose();
    };

    const categories = [
        { id: 'component', label: 'Components', icon: FileCode },
        { id: 'api', label: 'API Routes', icon: Server },
        { id: 'schema', label: 'Schemas', icon: Database },
        { id: 'ui', label: 'UI Elements', icon: Palette },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-backdrop p-4">
            <div className="w-full max-w-4xl max-h-[80vh] overlay-modal rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */ }
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold">Canvas Templates</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            ابدأ بسرعة مع Templates جاهزة
                        </p>
                    </div>
                    <button
                        onClick={ onClose }
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Templates Grid */ }
                <div className="flex-1 overflow-auto p-6">
                    { categories.map( ( category ) =>
                    {
                        const categoryTemplates = TEMPLATES.filter( t => t.category === category.id );
                        if ( categoryTemplates.length === 0 ) return null;

                        const CategoryIcon = category.icon;

                        return (
                            <div key={ category.id } className="mb-8 last:mb-0">
                                <div className="flex items-center gap-2 mb-4">
                                    <CategoryIcon className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-semibold">{ category.label }</h3>
                                    <span className="text-xs text-muted-foreground">
                                        ({ categoryTemplates.length })
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    { categoryTemplates.map( ( template ) =>
                                    {
                                        const TemplateIcon = template.icon;
                                        return (
                                            <button
                                                key={ template.id }
                                                onClick={ () => handleUseTemplate( template ) }
                                                className="p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all text-left group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                        <TemplateIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                                                            { template.name }
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                            { template.description }
                                                        </p>
                                                        <div className="mt-2">
                                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                                                { template.language }
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    } ) }
                                </div>
                            </div>
                        );
                    } ) }
                </div>
            </div>
        </div>
    );
}
