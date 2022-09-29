"""
DDS Broker connector
"""
import warnings
from datetime import datetime, timedelta
from typing import Any, Dict, List, Mapping, Optional

import numpy as np
from dds_backend import DataBroker
from restapi.connectors import Connector, ExceptionsList
from restapi.utilities.logs import log

wtypes = {
    "int32": "IntList",
    "int64": "IntList",
    "int": "IntList",
    "str": "StringList",
}


class BrokerExt(Connector):
    broker: Any

    def __init__(self) -> None:
        super().__init__()

    @staticmethod
    def get_connection_exception() -> ExceptionsList:
        return None

    def connect(self, **kwargs: str) -> "BrokerExt":

        catalog_dir = self.variables.get("catalog_dir", "/catalog")
        self.broker = DataBroker(
            # Place where catalog YAML file is located
            catalog_path=f"{catalog_dir}/catalog.yaml",
            # Directory where cache files should be stored
            cache_dir=f"{catalog_dir}/cache",
            # If details should be cached as well
            cache_details=True,
            # Directory where retrieved data are persisted
            storage=f"{catalog_dir}/download",
            # Directory where logs should be saved
            log_path=f"{catalog_dir}/logs",
        )
        return self

    def disconnect(self) -> None:
        self.disconnected = True

    def is_connected(self) -> bool:
        return not self.disconnected

    def get_datasets(self, filter_dataset_ids: List[str] = []) -> Dict[str, Any]:
        dataset_names = list(self.broker.list_datasets().keys())
        if filter_dataset_ids:
            dataset_names = [x for x in dataset_names if x in filter_dataset_ids]
        res: Dict[str, Any] = {}
        for dn in dataset_names:
            try:
                res[dn] = self.broker.get_details(dn)
            except Exception as exc:
                # do not block due to corrupt datasets
                log.exception(exc)
                log.warning(str(exc))
        return res

    def get_dataset_details(
        self, filter_dataset_ids: List[str] = []
    ) -> Mapping[str, Any]:
        datasets = self.get_datasets(filter_dataset_ids)
        return {
            "version": "v1",
            "status": "OK",
            "data": [
                dict(
                    **dataset["dataset_info"],
                    **{
                        "id": dataset_name,
                        "default": BrokerExt.unwrap(list(dataset["products"].keys())),
                        "products": [
                            {
                                "id": prod_name,
                                "description": prod.get("description", ""),
                                "variables": [
                                    {
                                        "value": api_name,
                                        "label": BrokerExt.unwrap(
                                            var.get("label", api_name)
                                        ),
                                        "units": BrokerExt.unwrap(var.get("units")),
                                    }
                                    for api_name, var in prod["variables"].items()
                                ]
                                if "variables" in prod
                                else None,
                            }
                            for prod_name, prod in dataset["products"].items()
                        ],
                    },
                )
                for dataset_name, dataset in datasets.items()
            ],
        }

    def get_product_for_dataset(
        self, dataset_id: str, product_id: str = None
    ) -> Mapping[str, Any]:
        datasets = self.get_datasets([dataset_id])
        if dataset_id not in datasets:
            raise LookupError(f"Dataset <{dataset_id}> does not exist")
        dataset = datasets[dataset_id]
        products, info = dataset["products"], dataset["dataset_info"]
        default_product_id = BrokerExt.unwrap(list(products.keys()))
        if product_id is None:
            product_id = default_product_id
        product = products[product_id]
        exclude_widgets = info.get("exclude_widgets", [])
        coords, attrs = product["coordinates"], product.get("attributes", {})
        log.debug(f"Excluded widgets: {exclude_widgets}")
        data: Dict[str, Any] = {
            "version": "v1",
            "status": "OK",
            "id": product_id,
            "label": BrokerExt.unwrap(product.get("description", "")),
            "dataset": dict(
                **info,
                **{
                    "id": dataset_id,
                    "default": default_product_id,
                    "products": [
                        {
                            "id": prod_name,
                            "description": BrokerExt.unwrap(
                                prod.get("description", "")
                            ),
                        }
                        for prod_name, prod in products.items()
                    ],
                },
            ),
            "widgets": [],
            "widgets_order": [],
            "constraints": None,
        }

        # Variables
        if "variables" in product and "variable" not in exclude_widgets:
            values = []
            for api_name, var in product["variables"].items():
                value = {
                    "value": api_name,
                }
                value["label"] = BrokerExt.unwrap(var.get("label", value["value"]))
                values.append(value)

            w = Widget(
                wname="variable",
                wlabel="Variables",
                wrequired=True,
                wparameter="variable",
                wtype="StringList",
                wdetails={"_values": values},
                wicon="sliders-h",
            )
            data["widgets"].append(w.to_dict())
            data["widgets_order"].append("variable")

        # Attributes
        filtered_attrs = {
            key: value for key, value in attrs.items() if key not in exclude_widgets
        }
        for attr_name, attr in filtered_attrs.items():
            values = []
            for val in attr["value"]:
                value = {"value": val, "label": val}
                values.append(value)
            w = Widget(
                wname=attr_name,
                wlabel=BrokerExt.unwrap(attr.get("label", {attr_name})),
                wrequired=False,
                wparameter=attr_name,
                wtype="StringList",
                wdetails={"_values": values},
            )
            data["widgets"].append(w.to_dict())
            data["widgets_order"].append(attr_name)

        # Temporal Coverage
        if "time" in coords and "temporal_coverage" not in exclude_widgets:
            w = Widget(
                wname="temporal_coverage",
                wlabel="Temporal coverage",
                wrequired=True,
                wparameter=None,
                wtype="ExclusiveFrame",
                wdetails={"widgets": ["date_list", "date_range"]},
                wicon="calendar-alt",
            )
            data["widgets"].append(w.to_dict())

            time = coords["time"]
            start = BrokerExt.unwrap(sorted(time["min"])).astype("M8[h]").astype("O")
            stop = (
                BrokerExt.unwrap(sorted(time["max"], reverse=True))
                .astype("M8[h]")
                .astype("O")
            )

            time_units = {"y": "year", "m": "month", "d": "day", "h": "hour"}
            unit = time_units[BrokerExt.unwrap(time.get("dds_step_unit", "h")).lower()]
            time_step = int(BrokerExt.unwrap(time["dds_step"]))
            step = (
                timedelta(**{f"{unit}s": time_step})
                if unit in {"day", "hour"}
                else timedelta(days=time_step * (365 if unit == "year" else 30))
            )

            time_widgets = {
                "year": [
                    {"label": str(y), "value": str(y)}
                    for y in range(start.year, stop.year + 1)
                ]
            }
            if (unit == "month" and time_step < 12) or step < timedelta(days=365):
                months = (
                    range(start.month, stop.month + 1)
                    if len(time_widgets["year"]) == 1
                    else range(1, 13)
                )
                time_widgets["month"] = [
                    {
                        "label": datetime.strptime(str(m), "%m").strftime("%B"),
                        "value": str(m),
                    }
                    for m in months
                ]
                if step < timedelta(days=28):
                    time_widgets["day"] = [
                        {"label": str(d), "value": str(d)} for d in range(1, 32)
                    ]
                    if step < timedelta(hours=24):
                        # minute = f"{start.minute:02d}"
                        time_widgets["hour"] = [
                            {"label": f"{h:02}", "value": f"{h:02}"} for h in range(24)
                        ]

            w = Widget(
                wname="date_list",
                wlabel="Date",
                wrequired=True,
                wparameter=None,
                wtype="InclusiveFrame",
                wdetails={"widgets": list(time_widgets.keys())},
            )
            data["widgets"].append(w.to_dict())

            for freq, time_values in time_widgets.items():
                w = Widget(
                    wname=freq,
                    wlabel=freq.capitalize(),
                    wrequired=True,
                    wparameter=f"time:{freq}",
                    wtype="StringList",
                    wdetails={"_values": time_values},
                )
                data["widgets"].append(w.to_dict())

            t_range = [
                {
                    "name": "start",
                    "label": "Start Date",
                    "range": BrokerExt.unwrap(time["min"]),
                },
                {
                    "name": "stop",
                    "label": "End Date",
                    "range": BrokerExt.unwrap(time["max"]),
                },
            ]
            w = Widget(
                wname="date_range",
                wlabel="Date range",
                wrequired=True,
                wparameter="time",
                wtype="DateTimeRange",
                wdetails={"_fields": t_range},
            )
            data["widgets"].append(w.to_dict())

            data["widgets_order"].append("temporal_coverage")

        # Spatial Coverage
        if (
            "latitude" in coords
            and "longitude" in coords
            and "spatial_coverage" not in exclude_widgets
        ):
            w = Widget(
                wname="spatial_coverage",
                wlabel="Spatial coverage",
                wrequired=False,
                wparameter=None,
                wtype="ExclusiveFrame",
                wdetails={"widgets": ["area", "location"]},
                wicon="globe",
            )
            data["widgets"].append(w.to_dict())
            data["widgets_order"].append("spatial_coverage")

            area_fields = [
                {
                    "name": orient,
                    "label": orient.capitalize(),
                    "range": BrokerExt.unwrap(coords[coord][ext]),
                }
                for orient, coord, ext in zip(
                    ("north", "west", "south", "east"),
                    ("latitude", "longitude") * 2,
                    ("max", "min", "min", "max"),
                )
            ]
            w = Widget(
                wname="area",
                wlabel="Area",
                wrequired=True,
                wparameter="area",
                wtype="geoarea",
                wdetails={"_fields": area_fields},
            )
            data["widgets"].append(w.to_dict())

            loc_fields = [
                {
                    "name": coord,
                    "label": coord.capitalize(),
                    "range": [
                        BrokerExt.unwrap(coords[coord][ext]) for ext in ("min", "max")
                    ],
                }
                for coord in ("latitude", "longitude")
            ]
            w = Widget(
                wname="location",
                wlabel="Location",
                wrequired=True,
                wparameter="location",
                wtype="geolocation",
                wdetails={"_fields": loc_fields},
            )
            data["widgets"].append(w.to_dict())

        # Auxiliary coordinates
        main_coords = {"time", "latitude", "longitude"}
        aux_coords = [coord for coord in coords if coord not in main_coords]
        if aux_coords:
            filtered_aux_coords = [i for i in aux_coords if i not in exclude_widgets]
            for coord in filtered_aux_coords:
                dtype = BrokerExt.unwrap(coords[coord].get("dds_dtype", "str"))
                w = Widget(
                    wname=coord,
                    wlabel=BrokerExt.unwrap(coords[coord]["label"]),
                    wrequired=True,
                    wparameter=None,
                    wtype="ExclusiveFrame",
                    wdetails={"widgets": [f"{coord}_list", f"{coord}_range"]},
                )
                data["widgets"].append(w.to_dict())
                data["widgets_order"].append(coord)

                values = [
                    {
                        "value": val,
                        "label": f"{val:.2f}"
                        if isinstance(val, (float, int, np.float64, np.float32))
                        else val,
                    }
                    for val in coords[coord]["value"]
                ]
                wtype = wtypes.get(dtype, "StringList")

                w = Widget(
                    wname=f"{coord}_list",
                    wlabel=BrokerExt.unwrap(coords[coord]["label"]),
                    wrequired=False,
                    wparameter=coord,
                    wtype=wtype,
                    wdetails={"_values": values},
                )
                data["widgets"].append(w.to_dict())
                #            data['widgets_order'].append(f'{coord}_list')

                min_ = coords[coord].get("min", min(coords[coord]["value"]))
                max_ = coords[coord].get("max", max(coords[coord]["value"]))
                range_ = [
                    {"name": "start", "label": f"Min {coord}", "range": min_},
                    {"name": "stop", "label": f"Max {coord}", "range": max_},
                ]
                w = Widget(
                    wname=f"{coord}_range",
                    wlabel=f"{BrokerExt.unwrap(coords[coord]['label'])}",
                    wrequired=False,
                    wparameter=coord,
                    wtype="NumberRange",
                    wdetails={"_fields": range_},
                )
                data["widgets"].append(w.to_dict())
        #            data['widgets_order'].append(f'{coord}_range')

        # Format
        if "format" not in exclude_widgets:
            format_list = [
                {"value": "netcdf", "label": "Netcdf", "ext": ".nc"},
                # {'value': 'pickle', 'label': 'Pickle', 'ext': '.pickle'}
            ]
            w = Widget(
                wname="format",
                wlabel="Format",
                wrequired=True,
                wparameter="format",
                wtype="FileFormat",
                wdetails={"_values": format_list},
            )
            data["widgets"].append(w.to_dict())
            data["widgets_order"].append("format")

        return data

    def get_dataset_image_filename(self, dataset_id: str) -> Any:
        datasets = self.get_datasets([dataset_id])
        if dataset_id not in datasets:
            raise LookupError(f"Dataset <{dataset_id}> does not exist")
        return datasets[dataset_id]["dataset_info"].get("image")

    @staticmethod
    def unwrap(obj: Any) -> Any:
        if isinstance(obj, (set, list)):
            return next(iter(obj))
        return obj


class Widget:
    def __init__(
        self,
        wname: str,
        wlabel: str,
        wrequired: bool,
        wparameter: Optional[str],
        wtype: str,
        wdetails: Optional[Mapping[str, Any]] = None,
        whelp: Optional[Any] = None,
        winfo: Optional[Any] = None,
        wicon: Optional[str] = None,
    ):
        self.__data = {
            "name": str(wname),
            "label": str(wlabel),
            "required": bool(wrequired),
            "parameter": str(wparameter) if wparameter is not None else None,
            "type": str(wtype),
            "details": wdetails,
            "help": whelp,
            "info": winfo,
        }
        if wicon:
            self.__data["icon"] = wicon

    def __getitem__(self, key: str) -> Any:
        return self.__data[key]

    def to_dict(self) -> Dict[str, Any]:
        return self.__data.copy()

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Widget":
        return Widget(**data)


instance = BrokerExt()


def get_instance(
    verification: Optional[int] = None,
    expiration: Optional[int] = None,
    **kwargs: str,
) -> "BrokerExt":

    # #################################################
    # ######     REMOVE ME IN A NEAR FUTURE !    ######
    # #################################################
    warnings.filterwarnings(
        "ignore",
        message="In a future release of intake, the intake.registry will not be directly mutable. Use intake.register_driver.",
    )
    warnings.filterwarnings(
        "ignore",
        message="In a future release of intake, the intake.container_map will not be directly mutable. Use intake.register_container.",
    )

    warnings.filterwarnings(
        "ignore",
        message="numpy.ndarray size changed, may indicate binary incompatibility",
    )

    # #################################################
    return instance.get_instance(
        verification=verification, expiration=expiration, **kwargs
    )
