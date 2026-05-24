import type {Storage} from "firebase-admin/storage";

type Bucket = ReturnType<Storage["bucket"]>;
type StorageFile = ReturnType<Bucket["file"]>;
type SaveData = Parameters<StorageFile["save"]>[0];
type SaveOptions = NonNullable<Parameters<StorageFile["save"]>[1]>;
type SignedUrlConfig = Parameters<StorageFile["getSignedUrl"]>[0];

type FileMetadata = {
  bucket?: string;
  name?: string;
  contentType?: string;
  size?: string | number;
  updated?: string;
  md5Hash?: string;
};

export type UploadAssetInput = {
  path: string;
  data: SaveData;
  contentType?: string;
  metadata?: Record<string, string>;
};

export type AssetMetadata = {
  bucket: string;
  path: string;
  contentType?: string;
  size?: string;
  updated?: string;
  md5Hash?: string;
};

export type SignedReadUrlOptions = {
  expiresAt: Date | number | string;
};

export class AssetStore {
  constructor(
    private readonly bucket: Bucket,
    private readonly basePath = ""
  ) {}

  async upload(input: UploadAssetInput): Promise<AssetMetadata> {
    const file = this.file(input.path);
    const options = this.toSaveOptions(input);

    await file.save(input.data, options);
    return this.getMetadata(input.path);
  }

  async exists(path: string): Promise<boolean> {
    const [exists] = await this.file(path).exists();
    return exists;
  }

  async getMetadata(path: string): Promise<AssetMetadata> {
    const [metadata] = await this.file(path).getMetadata();
    return this.toAssetMetadata(metadata);
  }

  async createSignedReadUrl(
    path: string,
    options: SignedReadUrlOptions
  ): Promise<string> {
    const config = {
      action: "read",
      expires: options.expiresAt,
    } satisfies SignedUrlConfig;
    const [url] = await this.file(path).getSignedUrl(config);
    return url;
  }

  async delete(path: string): Promise<void> {
    await this.file(path).delete({ignoreNotFound: true});
  }

  file(path: string): StorageFile {
    return this.bucket.file(this.resolvePath(path));
  }

  private resolvePath(path: string): string {
    const cleanPath = path.replace(/^\/+/, "");
    const cleanBasePath = this.basePath.replace(/^\/+|\/+$/g, "");

    if (!cleanBasePath) {
      return cleanPath;
    }

    return `${cleanBasePath}/${cleanPath}`;
  }

  private toSaveOptions(input: UploadAssetInput): SaveOptions {
    return {
      metadata: {
        contentType: input.contentType,
        metadata: input.metadata,
      },
    };
  }

  private toAssetMetadata(metadata: FileMetadata): AssetMetadata {
    return {
      bucket: metadata.bucket ?? this.bucket.name,
      path: metadata.name ?? "",
      contentType: metadata.contentType,
      size: metadata.size?.toString(),
      updated: metadata.updated,
      md5Hash: metadata.md5Hash,
    };
  }
}
