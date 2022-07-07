from restapi.exceptions import ExceptionType, RestApiException


class DiskQuotaException(Exception):
    """Exception for disk quota exceeding"""


class AccessToDatasetDenied(Exception):
    """Exception for permission denied to dataset access"""


class EmptyOutputFile(Exception):
    """Exception for empty output file"""


class NotYetImplemented(RestApiException):
    def __init__(self, exception: ExceptionType, is_warning: bool = False):
        super().__init__(exception, status_code=501, is_warning=is_warning)
