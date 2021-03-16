# from restapi.connectors import sqlalchemy


class Initializer:

    """
    This class is instantiated just after restapi init
    Implement the constructor to add operations performed one-time at initialization
    """

    def __init__(self) -> None:
        # c = sqlalchemy.get_instance()
        pass

    # This method is called after normal initialization if TESTING mode is enabled
    def initialize_testing_environment(self) -> None:
        pass
