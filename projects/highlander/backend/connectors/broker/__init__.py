"""
DDS Broker connector
"""
from datetime import datetime, timedelta
from typing import Any, List, Mapping, Optional, Union

import numpy as np
from dds_backend import DataBroker
from restapi.connectors import Connector
from restapi.exceptions import ServiceUnavailable
from restapi.utilities.logs import log


class BrokerExt(Connector):
    broker: Any

    def __init__(self):
        super().__init__()

    def get_connection_exception(self):
        return (
            NotImplementedError,
            ServiceUnavailable,
            AttributeError,
            FileNotFoundError,
        )

    def connect(self, **kwargs):
        catalog_dir = self.variables.get("catalog_dir", "/catalog")
        self.broker = DataBroker(
            catalog_path=f"{catalog_dir}/catalog.yaml",  # Place where catalog YAML file is located
            cache_dir=f"{catalog_dir}/cache",  # Directory where cache files should be stored
            cache_details=True,  # If details should be cached as well
            storage=f"{catalog_dir}/download",  # Directory where retrieved data are persisted
            log_path=f"{catalog_dir}/logs",  # Directory where logs should be saved
        )
        return self

    def disconnect(self):
        self.disconnected = True

    def is_connected(self):
        return not self.disconnected

    def get_datasets(self, filter_dataset_ids: List[str] = None) -> Mapping[str, Any]:
        dataset_names = list(self.broker.list_datasets().keys())
        if filter_dataset_ids:
            dataset_names = list(
                filter(lambda x: x in filter_dataset_ids, dataset_names)
            )
        return {dn: self.broker.get_details(dn) for dn in dataset_names}

    def get_dataset_details(
        self, filter_dataset_ids: List[str] = None
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
        coords, attrs = product["coordinates"], product.get("attributes", {})
        data = {
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
        if "variables" in product:
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
            )
            data["widgets"].append(w.to_dict())
            data["widgets_order"].append("variable")

        # Attributes
        for attr_name, attr in attrs.items():
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

        if "time" in coords:
            w = Widget(
                wname="temporal_coverage",
                wlabel="Temporal coverage",
                wrequired=True,
                wparameter=None,
                wtype="ExclusiveFrame",
                wdetails={"widgets": ["date_list", "date_range"]},
            )
            data["widgets"].append(w.to_dict())

            time = coords["time"]
            start, stop = (
                BrokerExt.unwrap(time[ext]).astype("M8[h]").astype("O")
                for ext in ("min", "max")
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
                wdetails={"fields": t_range},
            )
            data["widgets"].append(w.to_dict())

            data["widgets_order"].append("temporal_coverage")

        if "latitude" in coords and "longitude" in coords:
            w = Widget(
                wname="spatial_coverage",
                wlabel="Spatial coverage",
                wrequired=False,
                wparameter=None,
                wtype="ExclusiveFrame",
                wdetails={"widgets": ["area", "location"]},
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
                wdetails={"fields": area_fields},
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
                wdetails={"fields": loc_fields},
            )
            data["widgets"].append(w.to_dict())

        # Auxiliary coordinates
        main_coords = {"time", "latitude", "longitude"}
        aux_coords = [coord for coord in coords if coord not in main_coords]
        if aux_coords:
            for coord in aux_coords:
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

                w = Widget(
                    wname=f"{coord}_list",
                    wlabel=BrokerExt.unwrap(coords[coord]["label"]),
                    wrequired=False,
                    wparameter=coord,
                    wtype="StringList",
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
                    wdetails={"fields": range_},
                )
                data["widgets"].append(w.to_dict())
        #            data['widgets_order'].append(f'{coord}_range')

        # Format
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

    def get_dataset_image_filename(self, dataset_id: str) -> str:
        datasets = self.get_datasets([dataset_id])
        if dataset_id not in datasets:
            raise LookupError(f"Dataset <{dataset_id}> does not exist")
        return datasets[dataset_id]["dataset_info"].get("image")

    @staticmethod
    def unwrap(obj):
        if isinstance(obj, (set, list)):
            return next(iter(obj))
        return obj


class Widget:
    def __init__(
        self,
        wname,
        wlabel,
        wrequired,
        wparameter,
        wtype,
        wdetails=None,
        whelp=None,
        winfo=None,
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

    def __getitem__(self, key):
        return self.__data[key]

    def to_dict(self):
        return self.__data.copy()

    @classmethod
    def from_dict(cls, data):
        return Widget(**data)


instance = BrokerExt()


def get_instance(
    verification: Optional[int] = None,
    expiration: Optional[int] = None,
    **kwargs: Union[Optional[str], int],
) -> "BrokerExt":
    return instance.get_instance(
        verification=verification, expiration=expiration, **kwargs
    )
