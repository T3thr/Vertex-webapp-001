// app/api/media/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as string; // 'character' | 'background' | 'audio' | 'other'
    const tags = formData.get('tags') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `divwy/${mediaType || 'general'}`,
          tags: tags ? tags.split(',') : [],
          context: {
            uploaded_by: session.user?.id,
            media_type: mediaType || 'general'
          }
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    return NextResponse.json({
      success: true,
      data: {
        public_id: (uploadResult as any).public_id,
        secure_url: (uploadResult as any).secure_url,
        width: (uploadResult as any).width,
        height: (uploadResult as any).height,
        format: (uploadResult as any).format,
        resource_type: (uploadResult as any).resource_type,
        bytes: (uploadResult as any).bytes,
        mediaType: mediaType || 'general',
        uploadedBy: session.user?.id,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get('mediaType');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Search Cloudinary resources
    const searchOptions: any = {
      resource_type: 'auto',
      type: 'upload',
      prefix: `divwy/`,
      max_results: limit,
      context: true,
      tags: true
    };

    if (mediaType) {
      searchOptions.prefix = `divwy/${mediaType}/`;
    }

    const result = await cloudinary.search
      .expression(`folder:divwy/* AND context.uploaded_by=${session.user?.id}`)
      .sort_by('created_at', 'desc')
      .max_results(limit)
      .execute();

    return NextResponse.json({
      success: true,
      data: result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        resource_type: resource.resource_type,
        bytes: resource.bytes,
        created_at: resource.created_at,
        mediaType: resource.context?.media_type || 'general',
        tags: resource.tags || []
      })),
      total_count: result.total_count
    });

  } catch (error: any) {
    console.error('Media fetch error:', error);
    return NextResponse.json(
      { error: 'Fetch failed', message: error.message },
      { status: 500 }
    );
  }
}
