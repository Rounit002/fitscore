jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

const { cloudinary, deleteImageByUrl, extractCloudinaryPublicId } = require('./cloudinary');

describe('Cloudinary deletion helpers', () => {
  beforeEach(() => {
    cloudinary.uploader.destroy.mockReset();
  });

  it('extracts the public id from an uploaded secure URL', () => {
    expect(extractCloudinaryPublicId(
      'https://res.cloudinary.com/demo/image/upload/v1720000000/scans/account/photo.jpg'
    )).toBe('scans/account/photo');
  });

  it('does not treat another host as a deletable Cloudinary asset', async () => {
    await expect(deleteImageByUrl(
      'https://example.com/image/upload/v1720000000/scans/photo.jpg'
    )).resolves.toEqual({ deleted: false, skipped: true });
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it('deletes the hosted image and invalidates cached copies', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    await expect(deleteImageByUrl(
      'https://res.cloudinary.com/demo/image/upload/v1720000000/scans/photo.png'
    )).resolves.toEqual({ deleted: true, publicId: 'scans/photo' });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('scans/photo', {
      resource_type: 'image',
      invalidate: true,
    });
  });

  it('fails closed when the provider does not confirm deletion', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'error' });

    await expect(deleteImageByUrl(
      'https://res.cloudinary.com/demo/image/upload/v1720000000/scans/photo.jpg'
    )).rejects.toThrow('Cloudinary did not delete scans/photo');
  });
});
