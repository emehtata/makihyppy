from __future__ import annotations

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import extract_svi_basic as extractor


def basic_line(next_pointer: int, number: int, body: bytes) -> bytes:
    return next_pointer.to_bytes(2, "little") + number.to_bytes(2, "little") + body + b"\0"


class CasWrapperTests(unittest.TestCase):
    def test_rejects_missing_leader_and_payload(self) -> None:
        with self.assertRaisesRegex(ValueError, "leader"):
            extractor.strip_cas_wrappers(b"not a cassette")
        with self.assertRaisesRegex(ValueError, "payload"):
            extractor.strip_cas_wrappers(extractor.LEADER)

    def test_strips_data_only_and_named_header_blocks(self) -> None:
        data_only = extractor.strip_cas_wrappers(extractor.LEADER + b"PROGRAM")
        self.assertEqual(data_only, extractor.CasProgram(name=None, payload=b"PROGRAM"))

        named = (
            extractor.LEADER
            + extractor.HEADER_MARKER
            + b"MAKIHY \0"
            + extractor.LEADER
            + b"BASIC"
        )
        self.assertEqual(extractor.strip_cas_wrappers(named), extractor.CasProgram("MAKIHY", b"BASIC"))

    def test_rejects_header_without_data_block(self) -> None:
        with self.assertRaisesRegex(ValueError, "no data block"):
            extractor.strip_cas_wrappers(extractor.LEADER + extractor.HEADER_MARKER + b"NAME\0")


class NumberAndTokenTests(unittest.TestCase):
    def test_read_le_u16_and_number_tokens(self) -> None:
        self.assertEqual(extractor.read_le_u16(b"\x34\x12", 0), 0x1234)
        payload = b"\0\0\0\0\0\0\x34\x12"
        cases = [
            (b"\x0B\x08\0", "&O10", 3),
            (b"\x0C\xFE\xCA", "&HCAFE", 3),
            (b"\x0D\x05\x80", "4660", 3),
            (b"\x0E\x39\x30", "12345", 3),
            (b"\x0F\x2A", "42", 2),
            (b"\x11", "0", 1),
            (b"\x1A", "9", 1),
            (b"\x1C\xFF\xFF", "65535", 3),
            (b"\x7F", "<0x7F>", 1),
        ]
        for line, expected, next_index in cases:
            with self.subTest(line=line):
                self.assertEqual(extractor.decode_number(payload, line, 0), (expected, next_index))

    def test_number_references_and_float_tokens(self) -> None:
        self.assertEqual(extractor.decode_number(b"", b"\x0D\x01\x80", 0), ("32769", 3))
        single, next_index = extractor.decode_number(b"", b"\x1D\x46\x12\x34\x56", 0)
        self.assertEqual(next_index, 5)
        self.assertTrue(single)
        double, next_index = extractor.decode_number(b"", b"\x1F\x4E\x12\x34\x56\x78\x12\x34\x56", 0)
        self.assertEqual(next_index, 9)
        self.assertTrue(double)

    def test_float_formatting_and_token_spacing(self) -> None:
        self.assertEqual(extractor.format_msx_float("", 0, True), "0")
        self.assertEqual(extractor.format_msx_float("1", -1, True), ".1")
        self.assertEqual(extractor.format_msx_float("100", 0, False), "100#")

        parts: list[str] = []
        extractor.append_token(parts, "PRINT", ord("X"))
        extractor.append_token(parts, "XOR", ord("Y"))
        extractor.append_token(parts, "TAB(", ord("1"))
        self.assertEqual("".join(parts), "PRINT XOR TAB(")

    def test_decodes_strings_comments_and_extended_tokens(self) -> None:
        print_token = bytes([0x91])
        rem_token = bytes([0x8F])
        line = print_token + b'"A' + bytes([0x91]) + b'"' + b":" + rem_token + b" raw\x91"
        self.assertEqual(extractor.decode_line_text(b"", line, extractor.TOKENS1_SVI), 'PRINT "A\x91":REM  raw\x91')

        apostrophe = b":" + bytes([0x8F, 0xE6]) + b"comment"
        self.assertEqual(extractor.decode_line_text(b"", apostrophe, extractor.TOKENS1_SVI), "'comment")

        extended = bytes([0xFF, 0x86])
        self.assertEqual(extractor.decode_line_text(b"", extended, extractor.TOKENS1_SVI), "ABS")
        self.assertEqual(extractor.decode_line_text(b"", bytes([0xFF, 0x01]), extractor.TOKENS1_SVI), "FF_01")

    def test_decodes_colon_special_cases_and_number_spacing(self) -> None:
        line = b"A:" + bytes([0xA1]) + bytes([0x0F, 4]) + b":" + bytes([0x0E, 2, 0])
        self.assertEqual(extractor.decode_line_text(b"", line, extractor.TOKENS1_SVI), "A ELSE 4:2")
        self.assertEqual(extractor.decode_line_text(b"", b"< >", extractor.TOKENS1_SVI), "<>")


class PayloadAndCliTests(unittest.TestCase):
    def test_detect_dialect(self) -> None:
        self.assertEqual(extractor.detect_dialect(b"", "svi"), "svi")
        self.assertEqual(extractor.detect_dialect(b"\0\0\0\0abc\0", "auto"), "msx")
        self.assertEqual(extractor.detect_dialect(b"\0\0\0\0\xEE\0", "auto"), "svi")
        self.assertEqual(extractor.detect_dialect(b"\0\0\0\0abc", "auto"), "svi")

    def test_decodes_payload_using_pointers_and_terminator_fallback(self) -> None:
        first_body = bytes([0x91]) + b'"HI"'
        second_body = bytes([0x81])
        first_size = 4 + len(first_body) + 1
        second_size = 4 + len(second_body) + 1
        first = basic_line(0x8001 + first_size, 10, first_body)
        second = basic_line(0x8001 + first_size + second_size, 20, second_body)
        payload = first + second + b"\0\0\0\0"
        self.assertEqual(extractor.decode_basic_payload(payload, "svi"), ['10 PRINT "HI"', "20 END"])

        fallback = basic_line(0x8001, 30, b"ABC")
        self.assertEqual(extractor.decode_basic_payload(fallback, "msx"), ["30 ABC"])

    def test_rejects_bad_or_empty_payloads(self) -> None:
        with self.assertRaisesRegex(ValueError, "terminator"):
            extractor.decode_basic_payload(b"\x01\x80\x0A\0ABC", "svi")
        with self.assertRaisesRegex(ValueError, "No BASIC lines"):
            extractor.decode_basic_payload(b"\0\0\0\0", "svi")

    def test_main_writes_listing_with_header_and_default_output(self) -> None:
        body = bytes([0x81])
        payload = basic_line(0x8001 + 4 + len(body) + 1, 10, body) + b"\0\0\0\0"
        cassette = extractor.LEADER + extractor.HEADER_MARKER + b"GAME\0" + extractor.LEADER + payload
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = Path(temp_dir) / "game.cas"
            input_path.write_bytes(cassette)
            with mock.patch.object(sys, "argv", ["extract_svi_basic.py", str(input_path), "--dialect", "svi"]):
                extractor.main()
            self.assertEqual(
                input_path.with_suffix(".bas").read_text(),
                "' Extracted from CAS file name: GAME\n' Detokenized as: SVI\n10 END\n",
            )


if __name__ == "__main__":
    unittest.main()