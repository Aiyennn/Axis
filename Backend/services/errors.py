"""Expected application failures, translated to HTTP only at the API boundary."""


class ApplicationError(Exception):
    pass


class TaskNotFound(ApplicationError):
    pass


class WorkspaceConflict(ApplicationError):
    pass


class InvalidTaskEdit(ApplicationError):
    pass


class BriefingUnavailable(ApplicationError):
    pass


class AccountConflict(ApplicationError):
    pass


class InvalidCredentials(ApplicationError):
    pass


class SignInRequired(ApplicationError):
    pass


class TooManyAttempts(ApplicationError):
    pass
