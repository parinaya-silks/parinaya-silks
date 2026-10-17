import { serverFirebase } from '../server/firebase.ts';
import { cloudinaryMedia } from '../server/cloudinary.ts';
import { catalogService } from '../server/catalog.ts';
import { catalogHandler } from '../server/handler.ts';
export default catalogHandler(()=>catalogService({...serverFirebase(),media:cloudinaryMedia()}));
