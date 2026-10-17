import { catalogHandler } from '../server/handler.ts';
import { CatalogConfigurationError } from '../server/errors.ts';

// Keep SDK loading inside the handler's error boundary. A runtime import failure
// must produce a safe JSON error, rather than terminate the function process.
export default catalogHandler(async()=>{
  let modules;
  try {
    modules=await Promise.all([import('../server/firebase.ts'),import('../server/catalog.ts'),import('../server/cloudinary.ts')]);
  } catch(error) {
    throw new CatalogConfigurationError('Catalog server modules could not load.','server-module-load',{cause:error});
  }
  const [{serverFirebase},{catalogService},{cloudinaryMedia}]=modules;
  return catalogService({...serverFirebase(),media:cloudinaryMedia()});
});
