namespace Juggle.Api.Data.Entities;

public enum OrgRole { OrgAdmin, User }

public enum TeamRole { TeamAdmin, Member }

public enum StatusCategory { Todo, InProgress, Review, Done }

public enum RequestStatus { New, Accepted, Rejected }

public enum RequestType { Presentation, Social, Print, Web, Video, Copy, Other }

public enum Priority { Low, Medium, High, Urgent }

public enum TimeOffType { AnnualLeave, SickLeave, PublicHoliday }

public enum TimeOffStatus { Pending, Approved, Declined }
