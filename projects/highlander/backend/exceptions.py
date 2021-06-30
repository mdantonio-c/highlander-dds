class DiskQuotaException(Exception):
    """Exception for disk quota exceeding"""


class AccessToDatasetDenied(Exception):
    """Exception for permission denied to dataset access"""


class EmptyOutputFile(Exception):
    """Exception for empty output file"""
