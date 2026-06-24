// ---------------------------------------------------------------------------
// Offline feature — barrel export
// ---------------------------------------------------------------------------

export { setFactory, getFactory, createOnlineFactory, createOfflineFactory, seedOfflineData, isOfflineMode, isOnlineMode } from "./factory"
export type { ServiceFactory } from "./factory"

export { OfflineUserStore } from "./offline/OfflineUserStore"

export { OfflineBooksService } from "./offline/OfflineBooksService"
export { OfflineCategoriesService } from "./offline/OfflineCategoriesService"
export { OfflineTransactionsService } from "./offline/OfflineTransactionsService"
export { OfflineReportsService } from "./offline/OfflineReportsService"
export { OfflineUsersService } from "./offline/OfflineUsersService"
export { OfflineExportsService } from "./offline/OfflineExportsService"
export { OfflineImportService } from "./offline/OfflineImportService"

export { OnlineBooksService } from "./online/OnlineBooksService"
export { OnlineCategoriesService } from "./online/OnlineCategoriesService"
export { OnlineTransactionsService } from "./online/OnlineTransactionsService"
export { OnlineReportsService } from "./online/OnlineReportsService"
export { OnlineUsersService } from "./online/OnlineUsersService"
export { OnlineExportsService } from "./online/OnlineExportsService"
export { OnlineImportService } from "./online/OnlineImportService"

export type { IBooksService, CreateBookRequest, UpdateBookRequest, CloseBookRequest, AddShareRequest, UpdateShareRequest, GetBookStatsParams } from "./interfaces/IBooksService"
export type { ICategoriesService, CreateCategoryRequest, UpdateCategoryRequest, DeleteCategoryParams, ReassignCategoriesRequest, ReorderCategoriesRequest } from "./interfaces/ICategoriesService"
export type { ITransactionsService, GetTransactionsParams, CreateTransactionRequest, UpdateTransactionRequest, PaginatedTransactions } from "./interfaces/ITransactionsService"
export type { IReportsService, GetTotalsParams, GetCategoryReportParams, GetDailyReportParams, GetMonthlyReportParams, GetAverageParams } from "./interfaces/IReportsService"
export type { IUsersService } from "./interfaces/IUsersService"
export type { IExportsService, ContentType, ExportFormat, CreateExportRequest, CreateExportResponse } from "./interfaces/IExportsService"
export type { IImportService, ImportRequest, ImportResult } from "./interfaces/IImportService"