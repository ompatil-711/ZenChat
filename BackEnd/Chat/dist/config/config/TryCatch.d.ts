import type { NextFunction, Request, Response } from "express";
declare const TryCatch: (handler: (req: any, res: Response, next: NextFunction) => Promise<void | Response>) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default TryCatch;
//# sourceMappingURL=TryCatch.d.ts.map