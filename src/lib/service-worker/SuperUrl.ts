// import { decodePath } from "@/lib/paths2";

// /**
//  * Extended URL class that provides additional pathname utilities for service worker handlers.
//  * Includes a decodedPathname getter that automatically decodes URI components in the pathname.
//  */
// export class SuperUrl extends URL {
//   private _decodedPathname?: string;

//   constructor(url: string | URL, base?: string | URL) {
//     super(url, base);
//   }

//   /**
//    * Returns the decoded pathname, where URI-encoded components are properly decoded.
//    * This is cached after first calculation for performance.
//    */
//   get decodedPathname(): string {
//     if (this._decodedPathname === undefined) {
//       this._decodedPathname = decodePath(this.pathname);
//     }
//     return this._decodedPathname;
//   }

//   /**
//    * Create a SuperUrl instance from a standard URL or URL string
//    */
//   static from(url: string | URL): SuperUrl {
//     return new SuperUrl(url);
//   }
// }
