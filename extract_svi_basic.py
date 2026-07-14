#!/usr/bin/env python3

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


TOKENS1_MSX = [
    "", "END", "FOR", "NEXT", "DATA", "INPUT", "DIM", "READ", "LET",
    "GOTO", "RUN", "IF", "RESTORE", "GOSUB", "RETURN", "REM", "STOP",
    "PRINT", "CLEAR", "LIST", "NEW", "ON", "WAIT", "DEF", "POKE", "CONT",
    "CSAVE", "CLOAD", "OUT", "LPRINT", "LLIST", "CLS", "WIDTH", "ELSE",
    "TRON", "TROFF", "SWAP", "ERASE", "ERROR", "RESUME", "DELETE",
    "AUTO", "RENUM", "DEFSTR", "DEFINT", "DEFSNG", "DEFDBL", "LINE",
    "OPEN", "FIELD", "GET", "PUT", "CLOSE", "LOAD", "MERGE", "FILES",
    "LSET", "RSET", "SAVE", "LFILES", "CIRCLE", "COLOR", "DRAW", "PAINT",
    "BEEP", "PLAY", "PSET", "PRESET", "SOUND", "SCREEN", "VPOKE",
    "SPRITE", "VDP", "BASE", "CALL", "TIME", "KEY", "MAX", "MOTOR",
    "BLOAD", "BSAVE", "DSKO$", "SET", "NAME", "KILL", "IPL", "COPY", "CMD",
    "LOCATE", "TO", "THEN", "TAB(", "STEP", "USR", "FN", "SPC(", "NOT",
    "ERL", "ERR", "STRING$", "USING", "INSTR", "'", "VARPTR", "CSRLIN",
    "ATTR$", "DSKI$", "OFF", "INKEY$", "POINT", ">", "=", "<", "+", "-", "*",
    "/", "^", "AND", "OR", "XOR", "EQV", "IMP", "MOD", "\\", "\0x127",
]

TOKENS1_SVI = [
    "", "END", "FOR", "NEXT", "DATA", "INPUT", "DIM", "READ", "LET",
    "GOTO", "RUN", "IF", "RESTORE", "GOSUB", "RETURN", "REM", "STOP",
    "PRINT", "CLEAR", "LIST", "NEW", "ON", "WAIT", "DEF", "POKE", "CONT",
    "CSAVE", "CLOAD", "OUT", "LPRINT", "LLIST", "CLS", "WIDTH", "ELSE",
    "TRON", "TROFF", "SWAP", "ERASE", "ERROR", "RESUME", "DELETE",
    "AUTO", "RENUM", "DEFSTR", "DEFINT", "DEFSNG", "DEFDBL", "LINE",
    "OPEN", "FIELD", "GET", "PUT", "CLOSE", "LOAD", "MERGE", "FILES",
    "LSET", "RSET", "SAVE", "LFILES", "CIRCLE", "COLOR", "DRAW", "PAINT",
    "BEEP", "PLAY", "PSET", "PRESET", "SOUND", "SCREEN", "VPOKE",
    "KEY", "CLICK", "SWITCH", "MAX", "MON", "MOTOR", "BLOAD", "BSAVE",
    "MDM", "DIAL", "DSKO$", "SET", "NAME", "KILL", "IPL", "COPY", "CMD",
    "LOCATE", "TO", "THEN", "TAB(", "STEP", "USR", "FN", "SPC(", "NOT",
    "ERL", "ERR", "STRING$", "USING", "INSTR", "'", "VARPTR", "CSRLIN",
    "ATTR$", "DSKI$", "OFF", "INKEY$", "POINT", "SPRITE", "TIME", ">",
    "=", "<", "+", "-", "*", "/", "^", "AND", "OR", "XOR", "EQV", "IMP",
    "MOD", "\\", "\0x127",
]

TOKENS2 = [
    "", "LEFT$", "RIGHT$", "MID$", "SGN", "INT", "ABS", "SQR", "RND", "SIN",
    "LOG", "EXP", "COS", "TAN", "ATN", "FRE", "INP", "POS", "LEN", "STR$",
    "VAL", "ASC", "CHR$", "PEEK", "VPEEK", "SPACE$", "OCT$", "HEX$",
    "LPOS", "BIN$", "CINT", "CSNG", "CDBL", "FIX", "STICK", "STRIG", "PDL",
    "PAD", "DSKF", "FPOS", "CVI", "CVS", "CVD", "EOF", "LOC", "LOF", "MKI$",
    "MKS$", "MKD$",
]

LEADER = bytes([0x55]) * 16 + bytes([0x7F])
HEADER_MARKER = bytes([0xD3]) * 10


@dataclass
class CasProgram:
    name: str | None
    payload: bytes


def read_le_u16(data: bytes, offset: int) -> int:
    return data[offset] | (data[offset + 1] << 8)


def strip_cas_wrappers(data: bytes) -> CasProgram:
    leader_index = data.find(LEADER)
    if leader_index == -1:
        raise ValueError("No CAS leader found")

    cursor = leader_index + len(LEADER)
    name = None

    if data[cursor:cursor + len(HEADER_MARKER)] == HEADER_MARKER:
        cursor += len(HEADER_MARKER)
        name_bytes = bytearray()
        while cursor < len(data):
            byte = data[cursor]
            cursor += 1
            if byte in (0x00, 0xFF):
                break
            name_bytes.append(byte)
        name = name_bytes.decode("ascii", errors="replace").rstrip()
        next_leader = data.find(LEADER, cursor)
        if next_leader == -1:
            raise ValueError("Found header block but no data block")
        cursor = next_leader + len(LEADER)

    payload = data[cursor:]
    if not payload:
        raise ValueError("CAS file has no BASIC payload")
    return CasProgram(name=name, payload=payload)


def decode_number(payload: bytes, line: bytes, index: int) -> tuple[str, int]:
    token = line[index]
    if token == 0x0B:
        value = int.from_bytes(line[index + 1:index + 3], "little")
        return f"&O{value:o}", index + 3
    if token == 0x0C:
        value = int.from_bytes(line[index + 1:index + 3], "little")
        return f"&H{value:X}", index + 3
    if token == 0x0D:
        target_addr = read_le_u16(line, index + 1)
        target_offset = target_addr - 0x8001
        if 0 <= target_offset + 3 < len(payload):
            return str(read_le_u16(payload, target_offset + 2)), index + 3
        return str(target_addr), index + 3
    if token == 0x0E:
        value = read_le_u16(line, index + 1)
        return str(value), index + 3
    if token == 0x0F:
        value = line[index + 1]
        return str(value), index + 2
    if 0x11 <= token <= 0x1A:
        return str(token - 0x11), index + 1
    if token == 0x1C:
        return str(read_le_u16(line, index + 1)), index + 3
    if token == 0x1D:
        exponent = (line[index + 1] & 0x7F) - 70
        digits = "".join(f"{byte:02X}" for byte in line[index + 2:index + 5])
        return format_msx_float(digits, exponent, single=True), index + 5
    if token == 0x1F:
        exponent = (line[index + 1] & 0x7F) - 78
        digits = "".join(f"{byte:02X}" for byte in line[index + 2:index + 9])
        return format_msx_float(digits, exponent, single=False), index + 9
    return f"<0x{token:02X}>", index + 1


def format_msx_float(digits: str, exponent: int, single: bool) -> str:
    digits = digits.upper()
    if not digits:
        return "0"
    mantissa = float(f"{digits}e{exponent}")
    if single:
        text = format(mantissa, ".6G")
        if text.startswith("0."):
            text = text[1:]
        if text.isdigit() and int(text) > 32767:
            text += "!"
        return text
    text = format(mantissa, ".14G")
    if text.startswith("0."):
        text = text[1:]
    if "E" not in text and "." not in text:
        text += "#"
    return text


def append_token(parts: list[str], token_text: str, next_byte: int | None) -> None:
    infix = {">", "=", "<", "+", "-", "*", "/", "^", "AND", "OR", "XOR", "EQV", "IMP", "MOD", "TO", "STEP", "THEN"}
    no_trailing_space = {"TAB(", "SPC(", "'"}
    text = "".join(parts)

    if token_text in infix:
        if text and not text.endswith((" ", ":", "(", ",")):
            parts.append(" ")
        parts.append(token_text)
        if next_byte not in (None, 0x29, 0x2C, 0x3A):
            parts.append(" ")
        return

    if text and text[-1].isalnum():
        parts.append(" ")

    parts.append(token_text)
    if token_text not in no_trailing_space and next_byte not in (None, 0x21, 0x23, 0x24, 0x25, 0x28, 0x29, 0x2C, 0x3A):
        parts.append(" ")


def decode_line_text(payload: bytes, line: bytes, tokens1: list[str]) -> str:
    parts: list[str] = []
    index = 0
    in_string = False
    in_rem = False

    while index < len(line):
        byte = line[index]
        if in_string:
            parts.append(chr(byte))
            in_string = byte != 0x22
            index += 1
            continue
        if byte == 0x22:
            parts.append('"')
            in_string = True
            index += 1
            continue
        if not in_rem:
            if 0x80 < byte < 0xFF:
                if byte == 0x8F:
                    if index + 1 < len(line) and line[index + 1] == 0xE6:
                        append_token(parts, "'", line[index + 2] if index + 2 < len(line) else None)
                        index += 2
                    else:
                        append_token(parts, "REM", line[index + 1] if index + 1 < len(line) else None)
                        index += 1
                    in_rem = True
                    continue
                append_token(parts, tokens1[byte - 0x80], line[index + 1] if index + 1 < len(line) else None)
                index += 1
                continue
            if byte == 0xFF:
                if index + 1 >= len(line):
                    break
                token_index = line[index + 1] - 0x80
                token_text = TOKENS2[token_index] if 0 <= token_index < len(TOKENS2) else f"FF_{line[index + 1]:02X}"
                append_token(parts, token_text, line[index + 2] if index + 2 < len(line) else None)
                index += 2
                continue
            if byte == 0x3A:
                next_byte = line[index + 1] if index + 1 < len(line) else None
                next_next = line[index + 2] if index + 2 < len(line) else None
                if next_byte == 0xA1 or (next_byte == 0x8F and next_next == 0xE6):
                    index += 1
                    continue
                parts.append(":")
                index += 1
                continue
            if byte < 0x20:
                number_text, index = decode_number(payload, line, index)
                parts.append(number_text)
                continue
        parts.append(chr(byte))
        index += 1

    text = "".join(parts).rstrip()
    text = text.replace("< >", "<>")
    text = text.replace("> =", ">=")
    text = text.replace("< =", "<=")
    return text


def detect_dialect(payload: bytes, preferred: str) -> str:
    if preferred != "auto":
        return preferred

    first_line_end = payload.find(b"\x00", 4)
    if first_line_end == -1:
        return "svi"
    first_line = payload[4:first_line_end]
    if any(byte in first_line for byte in (0xEE, 0xEF, 0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE)):
        return "svi"
    return "msx"


def decode_basic_payload(payload: bytes, dialect: str) -> list[str]:
    lines: list[str] = []
    offset = 0
    tokens1 = TOKENS1_SVI if dialect == "svi" else TOKENS1_MSX

    while offset + 4 <= len(payload):
        next_pointer = read_le_u16(payload, offset)
        line_number = read_le_u16(payload, offset + 2)
        if next_pointer == 0:
            break

        next_offset = next_pointer - 0x8001

        text_start = offset + 4
        if next_offset > offset:
            text_end = next_offset - 1
        else:
            text_end = payload.find(b"\x00", text_start)
            if text_end == -1:
                raise ValueError(f"Line {line_number} has no terminator")

        line_text = decode_line_text(payload, payload[text_start:text_end], tokens1)
        lines.append(f"{line_number} {line_text}".rstrip())

        if next_offset <= offset:
            offset = text_end + 1
        else:
            offset = next_offset

    if not lines:
        raise ValueError("No BASIC lines decoded")
    return lines


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract an SVI/MSX tokenized BASIC program from a CAS image.")
    parser.add_argument("input", type=Path, help="Input .cas file")
    parser.add_argument("output", type=Path, nargs="?", help="Output .bas listing path")
    parser.add_argument("--dialect", choices=["auto", "svi", "msx"], default="auto", help="Token dialect to use when detokenizing the BASIC program")
    args = parser.parse_args()

    data = args.input.read_bytes()
    cas_program = strip_cas_wrappers(data)
    dialect = detect_dialect(cas_program.payload, args.dialect)
    listing = decode_basic_payload(cas_program.payload, dialect)

    output_path = args.output or args.input.with_suffix(".bas")
    header = []
    if cas_program.name:
        header.append(f"' Extracted from CAS file name: {cas_program.name}")
    header.append(f"' Detokenized as: {dialect.upper()}")
    content = "\n".join(header + listing) + "\n"
    output_path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()