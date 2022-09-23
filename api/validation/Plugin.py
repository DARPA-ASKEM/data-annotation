from __future__ import annotations
from doctest import Example

from enum import Enum
from typing import List, Optional, Any, Dict
from xmlrpc.client import Boolean
from pydantic import BaseModel, Extra, Field

class Maintainer(BaseModel):
    class Config:
        extra = Extra.allow

    name: str = Field(
        ...,
        description="The full name of the dataset creator",
        examples=["Bob Fakename"],
        title="Creator Name",
    )
    email: str = Field(
        ...,
        description="Email address of the dataset creator",
        examples=["bob@fake.org"],
        title="Creator Email Address",
    )
    organization: Optional[str] = Field(
        None,
        description="Dataset Creator's Organization",
        examples=["World Bank"],
        title="Creator Organization",
    )
    website: Optional[str] = Field(
        None,
        description="Dataset source website",
        examples=["https://databank.worldbank.org/source/world-development-indicators"],
        title="Dataset Website",
    )


class Geography(BaseModel):
    class Config:
        extra = Extra.allow

    country: Optional[List[str]] = Field(
        None,
        description="List of countries covered by the dataset",
        examples=[["Ethiopia", "South Sudan"]],
        title="Countries",
    )
    admin1: Optional[List[str]] = Field(
        None,
        description="List of admin level 1 regions covered by the dataset",
        examples=[["Oromia", "Sidama", "Amhara"]],
        title="Admin Level 1",
    )
    admin2: Optional[List[str]] = Field(
        None,
        description="List of admin level 2 regions covered by the dataset",
        examples=[["West Gojjam", "East Gojjam", "Agew Awi", "Arsi", "Bale", "Borana"]],
        title="Admin Level 2",
    )
    admin3: Optional[List[str]] = Field(
        None,
        description="List of admin level 3 regions covered by the dataset",
        examples=[["Aminyaa", "Askoo", "Coole", "Galaanaa", "Qarsaa", "Qarcaa"]],
        title="Admin Level 3",
    )


class Period(BaseModel):
    class Config:
        extra = Extra.allow

    gte: int = Field(
        ...,
        description="Start Time (inclusive)",
        examples=[1234567890000],
        title="Start Time",
    )
    lte: int = Field(
        ...,
        description="End Time (inclusive)",
        examples=[1234567890000],
        title="End Time",
    )


class ConceptMatch(BaseModel):
    name: Optional[str] = Field(
        None,
        description="The name of the concept component in the ontology",
        examples=["wm/concept/humanitarian_assistance/food_aid"],
        title="Concept Component Name",
    )
    score: Optional[float] = Field(
        None,
        description="A score between 0 and 1 representing the strength of the match",
        examples=[0.785829484462738],
        title="Match Score",
    )


class TemporalResolution(Enum):
    annual = "annual"
    monthly = "monthly"
    dekad = "dekad"
    weekly = "weekly"
    daily = "daily"
    other = "other"


class Resolution(BaseModel):
    temporal_resolution: Optional[TemporalResolution] = Field(
        None,
        description="Temporal resolution of the output",
        title="Temporal Resolution",
    )
    spatial_resolution: Optional[List[float]] = Field(
        None,
        description="Spatial resolution of the output (in meters)",
        examples=[[20, 20]],
        max_items=2,
        min_items=2,
        title="Spatial Resolution",
    )


class OntologyComponents(BaseModel):
    concepts: Optional[List[ConceptMatch]] = Field(
        None,
        description="A list of concepts matched for this variable",
        title="Matched concepts",
    )
    processes: Optional[List[ConceptMatch]] = Field(
        None,
        description="A list of processes matched for this variable",
        title="Matched Processes",
    )
    properties: Optional[List[ConceptMatch]] = Field(
        None,
        description="A list of properties matched for this variable",
        title="Matched Properties",
    )


class Output(BaseModel):
    class Config:
        extra = Extra.allow

    name: str = Field(
        ...,
        description="The name of the output variable",
        examples=[
            "account_ownership_at_a_financial_institution_or_with_a_mobile_money_service_provider_older_adults_of_population_ages_25"
        ],
        title="Output Variable Name",
    )
    display_name: str = Field(
        ...,
        description="The user visible name of the output variable",
        examples=[
            "Account ownership at a financial institution or with a mobile-money-service provider, older adults (% of population ages 25+)"
        ],
        title="Output Variable Display Name",
    )
    description: str = Field(
        ...,
        description="The description of the output variable",
        examples=[
            "SOURCE NOTE: Account denotes the percentage of respondents who report having an account (by themselves or together with someone else) at a bank or another type of financial institution or report personally using a mobile money service in the past 12 months (older adults, % of population ages 25+).\\nSOURCE ORGANIZATION: Demirguc-Kunt et al., 2018, Global Financial Inclusion Database, World Bank."
        ],
        title="Output variable Description",
    )
    type: Type = Field(
        ..., description="The type of output variable", title="Output variable Type"
    )
    unit: str = Field(
        ...,
        description="The unit of the output variable",
        examples=["unitless"],
        title="Unit",
    )
    unit_description: Optional[str] = Field(
        None,
        description="A short description of the unit",
        examples=[""],
        title="Unit Description",
    )
    ontology: Optional[str] = Field(
        None,
        description="The id of the related DKG Ontology",
        title="Ontology ID",
    )
    is_primary: bool = Field(
        ...,
        description="Does this variable represent data based on the primary time and location columns",
        examples=[True],
        title="Is Primary?",
    )
    data_resolution: Optional[Resolution] = Field(
        None,
        description="Spatial and temporal resolution of the data",
        title="Data Resolution",
    )
    alias: Optional[Dict[Any,Any]] = Field(
        None,
        description="alias dictionary",
        title="Alias"
    )


class QualifierOutput(BaseModel):
    class Config:
        extra = Extra.allow

    name: str = Field(
        ...,
        description="The name of the output qualifier column in data file",
        examples=["service_type"],
        title="Output Qualifier Column Name",
    )
    display_name: str = Field(
        ...,
        description="The user visible name of the output qualifier",
        examples=["Type of money service"],
        title="Output Qualifier Display Name",
    )
    description: str = Field(
        ...,
        description="The description of the output qualifier",
        examples=["Type of money service used"],
        title="Output Qualifier Description",
    )
    type: Type1 = Field(
        ...,
        description="The type of the output qualifier",
        title="Output Qualifier Type",
    )
    unit: Optional[str] = Field(
        None,
        description="The unit of the output qualifier",
        examples=["unitless"],
        title="Unit",
    )
    unit_description: Optional[str] = Field(
        None,
        description="A short description of the unit",
        examples=[""],
        title="Unit Description",
    )
    related_features: List[str] = Field(
        ...,
        description="The feature names that this data should be used as a qualifier for",
        title="Related Features",
    )


class IndicatorMetadataSchema(BaseModel):
    class Config:
        extra = Extra.allow

    id: Optional[str] = Field(
        None,
        description="A unique dataset id",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
        title="Dataset ID",
    )
    name: str = Field(
        ..., description="The dataset name", examples=["WDI"], title="Dataset Name"
    )
    family_name: Optional[str] = Field(
        None,
        description="The dataset family name",
        examples=["WDI"],
        title="Dataset Family Name",
    )
    description: str = Field(
        ...,
        description="The description of the dataset.",
        examples=[
            "World Development Indicators are the World Bank's compilation of relevant, high-quality, and internationally comparable statistics about global development. The global database contains 1,600 time series indicators for 217 economies and more than 40 country groups, with data for many indicators going back more than 50 years.  There are ~1400 indicators for Ethiopia at the National level.  This data was pulled by the World Modelers program in September 2020."
        ],
        title="Dataset Description",
    )
    created_at: Optional[int] = Field(
        None,
        description="When the dataset was registered",
        examples=[1234567890000],
        title="Dataset Registration Time",
    )
    category: Optional[List[str]] = Field(
        None,
        description="List of categories",
        examples=[["Economic", "Agricultural"]],
        title="Categories",
    )
    domains: Optional[List[str]] = Field(
        None,
        description="List of domains, based on UNESCO nomenclature for fields of science and technology - https://skos.um.es/unesco6/00/html",
        examples=[["Medical Sciences", "Demographics"]],
        title="Domains",
    )
    maintainer: Maintainer = Field(
        ...,
        description="Information about the dataset maintainer.",
        title="Dataset Maintainer",
    )
    data_paths: Optional[List[str]] = Field(
        [],
        description="URL paths to data",
        examples=[["https://jataware-world-modelers.s3.amazonaws.com/WDI/data.csv"]],
        title="Data Path URLs",
    )
    outputs: Optional[List[Output]] = Field(
        [],
        description="An array of dataset variables",
        title="Dataset Outputs"
    )
    qualifier_outputs: Optional[List[QualifierOutput]] = Field(
        None,
        description="An array describing the additional qualifier columns in the output data files",
        title="Dataset Qualifier Outputs",
    )
    tags: Optional[List[str]] = Field(
        default_factory=list,
        description="The tags associated with the dataset.",
        examples=[["Agriculture"]],
        title="Search Tags",
    )
    geography: Optional[Geography] = Field(
        None,
        description="Information about the geography covered by the dataset",
        title="Geography",
    )
    period: Optional[Period] = Field(
        None, description="Data ranges covered by the dataset", title="Run time period"
    )
    deprecated: Optional[bool] = Field(
        False,
        description="Deprecated datasets should not be used for new models.",
    )
    data_sensitivity: Optional[str] = Field(
        None,
        description="Specifies any restrictions on data use.",
        examples=[
            "..."
        ],
        title="Dataset Sensitivity",
    )
    data_quality: Optional[str] = Field(
        None,
        description="Specify if the data is measured, derived, or estimated data and what was the methodology associated with each of these.",
        examples=[
            "measured"
        ],
        title="Dataset Quality",
    )
    published: Boolean = Field(
        False,
        description="Specifies if the dataset has been published or is still being registered or processed.",
        examples=[False],
        title="Is Published",
    )


class IndicatorsSearchSchema(BaseModel):
    class Config:
        extra = Extra.allow

    id: str = Field(
        ...,
        description="A unique dataset id",
        examples=["123e4567-e89b-12d3-a456-426614174000"],
        title="Dataset ID",
    )
    name: Optional[str] = Field(
        ..., description="The dataset name", examples=["WDI"], title="Dataset Name"
    )
    description: Optional[str] = Field(
        ...,
        description="The description of the dataset.",
        examples=[
            "World Development Indicators are the World Bank's compilation of relevant, high-quality, and internationally comparable statistics about global development. The global database contains 1,600 time series indicators for 217 economies and more than 40 country groups, with data for many indicators going back more than 50 years.  There are ~1400 indicators for Ethiopia at the National level.  This data was pulled by the World Modelers program in September 2020."
        ],
        title="Dataset Description",
    )
    created_at: Optional[int] = Field(
        None,
        description="When the dataset was registered",
        examples=[1234567890000],
        title="Dataset Registration Time",
    )
    maintainer: Optional[Maintainer] = Field(
        ...,
        description="Information about the dataset maintainer.",
        title="Dataset Maintainer",
    )
   

class DateValidationRequestSchema(BaseModel):
    format: str = Field(
        ...,
        description="Format of date in Python strptime format",
        examples=["%Y-%m-%d", "%Y", "%b %d, %Y"],
    )
    values: List[str] = Field(
        ...,
        description="List of values to validate the provided format against",
        examples=[
            ["2001-01-01", "2022-07-11", "2011-03-27"],
            ["2002", "2005", "1998"],
            ["Nov 11, 1911", "Dec 25, 2020", "Feb 9, 1999"],
        ]
    )


class DateValidationResponseSchema(BaseModel):
    format: str = Field(
        ...,
        description="Format of date in Python strptime format",
        examples=["%Y-%m-%d", "%Y", "%b %d, %Y"],
    )
    valid: bool = Field(
        ...,
        description="Indicates if format provided (and returned) matches the values sent in",
        examples=[True, False],
    )
