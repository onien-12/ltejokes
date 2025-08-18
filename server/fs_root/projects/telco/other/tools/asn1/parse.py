import asn1tools
import json

import asn1tools.codecs.jer as asntypes


def parse_asn1_definition(asn1_file_path):
    return asn1tools.compile_files(asn1_file_path, codec='jer')


def transform_type_to_json_element(name, type_def, compiled_module, is_optional=False, constraint_checker=None):
    element = {
        "name": name,
        "type": type_def._type.name,
        "description": "",
        "optional": is_optional,
    }

    print(type_def._type)

    if isinstance(type_def._type, asntypes.Sequence) or isinstance(type_def._type, asntypes.Choice):
        curr_constraint_checker = constraint_checker or type_def.constraints_checker._type 

        element["elements"] = []
        for member in type_def._type.members:
            member_name = member.name
            member_type_name = member.type_name
            constraint_member = [m for m in curr_constraint_checker.members if m.name == member_name][0]

            member_is_optional = member.optional 

            member_type_def = compiled_module.types.get(member_type_name)

            if member_type_def:
                element["elements"].append(
                    transform_type_to_json_element(
                        member_name, member_type_def, compiled_module, member_is_optional,
                        constraint_member 
                    )
                )
            else:
                element["elements"].append(
                    transform_type_to_json_element(
                        member_name, asntypes.CompiledType(member), compiled_module, member_is_optional,
                        constraint_member 
                    )
                )

    elif isinstance(type_def._type, asntypes.Enumerated):
        enum_values = [f"{name}" for name, _ in type_def._type.values.items()]
        element["type"] = f"ENUMERATED {{{', '.join(enum_values)}}}"
    elif isinstance(type_def._type, asntypes.Integer):
        if constraint_checker:
            if constraint_checker.minimum != "MIN" and constraint_checker.maximum != "MAX":
                element["type"] = f"INTEGER ({int(constraint_checker.minimum)}..{int(constraint_checker.maximum)})"
            elif constraint_checker.minimum != "MIN":
                element["type"] = f"INTEGER ({int(constraint_checker.minimum)}..)"
            elif constraint_checker.maximum != "MAX":
                element["type"] = f"INTEGER (..{int(constraint_checker.maximum)})"
        else:
            element["type"] = "INTEGER"
    elif isinstance(type_def._type, asntypes.Boolean):
        element["type"] = "BOOLEAN"

    return element


def convert_asn1_to_custom_json(asn1_file_path, root_types_to_include):
    compiled_module = parse_asn1_definition(asn1_file_path)

    protocols_data = {"protocols": []}

    rrc_protocol_entry = {
        "name": "rrc",
        "elements": []
    }

    for root_type_name in root_types_to_include:
        root_type_def = compiled_module.types.get(root_type_name)
        if root_type_def:
            rrc_protocol_entry["elements"].append(
                transform_type_to_json_element(
                    root_type_name, root_type_def, compiled_module
                )
            )
        else:
            print(
                f"Warning: Root type '{root_type_name}' not found in ASN.1 definition.")

    protocols_data["protocols"].append(rrc_protocol_entry)

    return protocols_data


if __name__ == "__main__":
    asn1_file = "rrc.asn"

    root_types = [
        "RadioResourceConfigCommonSIB",
    ]

    json_output = convert_asn1_to_custom_json(asn1_file, root_types)

    print(json.dumps(json_output, indent=2))
