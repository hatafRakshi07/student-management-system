from app.models.user import User, UserRole
from app.models.student import (
    StudentProfile, StudentAcademicHistory, StudentPromotion, StudentDocument,
    ClassMaster, SectionMaster, CategoryMaster, CourseMaster, DepartmentMaster
)
from app.models.teacher import TeacherProfile
from app.models.subject import Subject
from app.models.attendance import (
    Attendance, StudentAttendanceStatus, StaffAttendanceStatus, AttendanceSession,
    StudentAttendanceRecord, StaffAttendanceRecord, AttendanceSummary, HolidayRecord,
    WorkingDay, AttendanceAuditLog, AttendanceSetting, AttendanceStatus
)
from app.models.assignment import Assignment, Submission, SubmissionStatus
from app.models.exam import (
    Exam, Mark, ExamSchedule, MarkRecord, ResultSummary, GradeSystemRule,
    CGPAHistory, BacklogHistory, RevaluationRequest, ExamAuditLog, ExamCategory,
    ResultStatus, ExamType
)
from app.models.fee import (
    Fee, FeeStatus, FeeTransaction, FeeInstallment, FeeDiscount, UnmatchedFeeRecord, ImportLog,
    FeeReceipt, FeeSummary, Payment
)
from app.models.hr import (
    StaffDetail, StaffBankDetail, StaffSalaryStructure, SalaryTransaction,
    StaffLeaveBalance, StaffAuditLog, EmploymentType, StaffStatus, PayrollStatus
)
from app.models.parent import (
    ParentProfile, ParentStudentMapping, PTMRequest, ParentMessage, ParentAuditLog,
    RelationshipType, PTMStatus
)
from app.models.academic_planner import (
    AcademicSessionRecord, ClassroomRecord, FacultySubjectAllocation, TimetableSlotRecord,
    AcademicCalendarEvent, FacultyWorkloadSummary, TimetableAuditLog, RoomType, EventCategory, DayOfWeek
)
from app.models.library import (
    LibraryBookRecord, LibraryMemberRecord, LibraryIssueTransaction, LibraryBookReservation,
    LibraryFineRecord, LibraryAuditLog, BookStatus, MemberType, IssueStatus, FineStatus
)
from app.models.enterprise import (
    LMSCourseContent, LMSQuiz, LMSQuizQuestion, LMSAssignmentSubmission, LMSStudentProgress,
    AdmissionApplication, AdmissionDocument, AdmissionMeritList,
    LedgerAccount, JournalEntry, JournalLineItem, FinancialTransaction,
    ContentType, AdmissionStatus, AccountType, VoucherType
)
from app.models.expansion import (
    InventoryAssetRecord, InventoryMaintenanceLog, GeneratedCertificate,
    PlacementCompany, PlacementDrive, PlacementJobOffer, AlumniProfileRecord,
    AssetStatus, CertificateType, OfferStatus
)
from app.models.advanced import (
    ResearchProject, ResearchPublication, ResearchPatent,
    NAACAQARReport, NIRFRankingData, BiometricDevice, BiometricPunchLog,
    PatentStatus, DeviceType, DeviceStatus
)
from app.models.digital import (
    MobileDeviceToken, AIChatSession, AIPredictionLog
)
from app.models.tenant import (
    Tenant, TenantSetting, TenantSubscription, APIKey, WebhookEndpoint, SubscriptionPlan
)
from app.models.notice import Notice, TargetRole
from app.models.notification import Notification
from app.models.timetable import Timetable
from app.models.leave import Leave, LeaveRequest, LeaveStatus
from app.models.audit import AuditLog
from app.models.message import Message

__all__ = [
    "User", "UserRole",
    "StudentProfile", "StudentAcademicHistory", "StudentPromotion", "StudentDocument",
    "ClassMaster", "SectionMaster", "CategoryMaster", "CourseMaster", "DepartmentMaster",
    "TeacherProfile",
    "Subject",
    "Attendance", "StudentAttendanceStatus", "StaffAttendanceStatus", "AttendanceSession",
    "StudentAttendanceRecord", "StaffAttendanceRecord", "AttendanceSummary", "HolidayRecord",
    "WorkingDay", "AttendanceAuditLog", "AttendanceSetting", "AttendanceStatus",
    "Assignment", "Submission", "SubmissionStatus",
    "Exam", "Mark", "ExamSchedule", "MarkRecord", "ResultSummary", "GradeSystemRule",
    "CGPAHistory", "BacklogHistory", "RevaluationRequest", "ExamAuditLog", "ExamCategory",
    "ResultStatus", "ExamType",
    "Fee", "FeeStatus", "FeeTransaction", "FeeInstallment", "FeeDiscount", "UnmatchedFeeRecord", "ImportLog",
    "FeeReceipt", "FeeSummary", "Payment",
    "StaffDetail", "StaffBankDetail", "StaffSalaryStructure", "SalaryTransaction",
    "StaffLeaveBalance", "StaffAuditLog", "EmploymentType", "StaffStatus", "PayrollStatus",
    "ParentProfile", "ParentStudentMapping", "PTMRequest", "ParentMessage", "ParentAuditLog",
    "RelationshipType", "PTMStatus",
    "AcademicSessionRecord", "ClassroomRecord", "FacultySubjectAllocation", "TimetableSlotRecord",
    "AcademicCalendarEvent", "FacultyWorkloadSummary", "TimetableAuditLog", "RoomType", "EventCategory", "DayOfWeek",
    "LibraryBookRecord", "LibraryMemberRecord", "LibraryIssueTransaction", "LibraryBookReservation",
    "LibraryFineRecord", "LibraryAuditLog", "BookStatus", "MemberType", "IssueStatus", "FineStatus",
    "LMSCourseContent", "LMSQuiz", "LMSQuizQuestion", "LMSAssignmentSubmission", "LMSStudentProgress",
    "AdmissionApplication", "AdmissionDocument", "AdmissionMeritList",
    "LedgerAccount", "JournalEntry", "JournalLineItem", "FinancialTransaction",
    "ContentType", "AdmissionStatus", "AccountType", "VoucherType",
    "InventoryAssetRecord", "InventoryMaintenanceLog", "GeneratedCertificate",
    "PlacementCompany", "PlacementDrive", "PlacementJobOffer", "AlumniProfileRecord",
    "AssetStatus", "CertificateType", "OfferStatus",
    "ResearchProject", "ResearchPublication", "ResearchPatent",
    "NAACAQARReport", "NIRFRankingData", "BiometricDevice", "BiometricPunchLog",
    "PatentStatus", "DeviceType", "DeviceStatus",
    "MobileDeviceToken", "AIChatSession", "AIPredictionLog",
    "Tenant", "TenantSetting", "TenantSubscription", "APIKey", "WebhookEndpoint", "SubscriptionPlan",
    "Notice", "TargetRole",
    "Notification",
    "Timetable",
    "Leave", "LeaveRequest", "LeaveStatus",
    "AuditLog",
    "Message",
]
