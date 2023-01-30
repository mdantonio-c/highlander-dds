import io
from datetime import date
from pathlib import Path
from typing import Any, Optional

from flask import send_file
from fpdf import FPDF
from highlander.connectors import broker
from highlander.endpoints.utils import MapCropConfig as config
from restapi import decorators
from restapi.connectors import Connector
from restapi.exceptions import NotFound, ServerError
from restapi.models import Schema, fields, validate
from restapi.rest.definition import EndpointResource
from restapi.services.authentication import User
from restapi.utilities.logs import log

AREA_TYPES = ["regions", "provinces", "basins"]
LOGO_URL = Path(config.GEOJSON_PATH, "highlander-logo.png")
EU_LOGO_URL = Path(config.GEOJSON_PATH, "en_horizontal_cef_logo_2.png")


class PDF(FPDF):
    ch = 8
    # license = "CC BY 4.0"
    license = ""

    def header(self):
        self.image(str(LOGO_URL), 90, 5, 40)
        self.image(str(EU_LOGO_URL), 130, 12, 50)
        self.ln(15)

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "I", 8)
        self.cell(w=30, h=self.ch, txt=f"License : {self.license}", ln=1)
        self.set_text_color(128)
        self.cell(0, 10, "Page " + str(self.page_no()), 0, 0, "C")

    def report_title(self, label):
        self.set_font("Arial", "B", 20)
        self.set_fill_color(r=30, g=154, b=47)
        self.multi_cell(w=0, h=self.ch, txt=label, align="C", fill=True)
        self.ln(1)
        self.set_text_color(r=0, g=0, b=0)
        self.set_font("Arial", "", 12)
        self.cell(w=30, h=self.ch, txt="Date: ", ln=0)
        self.cell(w=30, h=self.ch, txt=str(date.today()), ln=1)
        self.cell(w=30, h=self.ch, txt="Attribution:", ln=0)
        self.cell(w=30, h=self.ch, txt="Highlander Project", ln=1)

        self.ln(self.ch)

    def report_body(self, label_map, file_path):
        self.set_font("Arial", "B", 20)
        self.multi_cell(w=0, h=self.ch, txt=label_map, align="C")
        self.image(file_path, x=5, y=None, w=200, h=0, type="PNG", link="")
        self.ln(self.ch)


class SubsetReportDetails(Schema):
    model_id = fields.Str(required=False)
    year = fields.Str(required=False)
    date = fields.Str(required=False)
    area_id = fields.Str(required=True)
    label = fields.Str(required=False)
    area_type = fields.Str(required=True, validate=validate.OneOf(AREA_TYPES))
    indicator = fields.Str(required=False)
    time_period = fields.Str(required=False)


class Report(EndpointResource):
    @decorators.endpoint(
        path="/datasets/<dataset_id>/products/<product_id>/report",
        summary="Download the report of a subset of data",
        responses={
            200: "report successfully retrieved",
            400: "missing parameters to get the report",
            404: "files to create the report not found",
            500: "Errors in creating the report",
        },
    )
    @decorators.use_kwargs(
        SubsetReportDetails,
        location="query",
    )
    @decorators.auth.require()
    def get(
        self,
        user: User,
        dataset_id: str,
        product_id: str,
        area_type: str,
        area_id: str,
        label: Optional[str] = None,
        indicator: Optional[str] = None,
        model_id: Optional[str] = None,
        year: Optional[str] = None,
        date: Optional[str] = None,
        time_period: Optional[str] = None,
    ) -> Any:
        # get the dataset
        dds = broker.get_instance()
        dataset_details = dds.get_dataset_details([dataset_id])
        if not dataset_details["data"]:
            raise NotFound(f"dataset {dataset_id} not found")

        # get the output structure
        endpoint_arguments = locals()
        area_name = area_id.lower()

        output_structure = config.getOutputPath(
            dataset_id, product_id, endpoint_arguments
        )
        if not output_structure:
            raise ServerError(
                f"{dataset_id} or {product_id} keys not present in output structure map"
            )

        output_dir = config.CROPS_OUTPUT_ROOT.joinpath(*output_structure)
        log.debug(f"Output dir: {output_dir}")

        # get the map filename
        map_filename = config.getOutputFilename("map", "png", "", area_name)
        # build the filepath for map
        map_filepath = Path(output_dir, map_filename)
        if not map_filepath.is_file():
            raise NotFound(
                "Map file for requested report not found: Please use /crop api to create it"
            )

        # get the plot filename
        # TODO the plot for the report will be the boxplot
        plot_filename = config.getOutputFilename(
            "plot", "png", "distribution", area_name
        )
        # build the filepath for plot
        plot_filepath = Path(output_dir, plot_filename)
        if not plot_filepath.is_file():
            raise NotFound(
                "Plot file for requested report not found: Please use /crop api to create it"
            )

        # get the dataset title
        title = dataset_details["data"][0]["label"]

        # create the labels
        # label params are the same of the output structure excluding the dataset name (first element) and the area type (last element)
        if not label:
            label_params = output_structure[1:-1]
            label = " - ".join(
                l_par.replace("-", " ").title() for l_par in label_params
            )
        label_map = f"Map {area_id.title()} - {label}"
        label_plot = f"Distribution of {label}"

        pdf = PDF()
        # get the dataset license
        pdf.license = dataset_details["data"][0]["license"]["name"]
        pdf.add_page()
        pdf.report_title(title)
        pdf.report_body(label_map, str(map_filepath))
        pdf.report_body(label_plot, str(plot_filepath))

        bytes_string = pdf.output(dest="S")
        pdf_bytes = bytes_string.encode("latin-1")

        return send_file(
            io.BytesIO(pdf_bytes),
            download_name="highlander_report.pdf",
            mimetype="application/pdf",
        )
