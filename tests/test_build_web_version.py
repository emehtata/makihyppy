from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

import build_web_version as version


class VersionGenerationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.web = Path(self.temp_dir.name) / "web"
        self.web.mkdir()
        self.sources = tuple(self.web / name for name in ("index.html", "style.css", "game.js"))
        for source, content in zip(self.sources, ("<html>", "body {}", "const game = 1;")):
            source.write_text(content)
        self.output = self.web / "version.js"
        self.patch = mock.patch.multiple(version, ROOT=Path(self.temp_dir.name), WEB=self.web, SOURCES=self.sources, OUTPUT=self.output)
        self.patch.start()

    def tearDown(self) -> None:
        self.patch.stop()
        self.temp_dir.cleanup()

    def test_source_hash_changes_when_source_changes(self) -> None:
        first = version.source_hash()
        self.sources[2].write_text("const game = 2;")
        self.assertNotEqual(first, version.source_hash())
        self.assertEqual(len(first), 12)

    def test_main_writes_stable_generated_version(self) -> None:
        fixed_time = datetime(2026, 7, 15, 12, 30, 45, tzinfo=timezone.utc)
        with mock.patch.object(version, "datetime") as mocked_datetime:
            mocked_datetime.now.return_value = fixed_time
            mocked_datetime.now.timezone = timezone.utc
            version.main()

        first = self.output.read_text()
        self.assertIn('"built": "20260715-123045 UTC"', first)
        version.main()
        self.assertEqual(self.output.read_text(), first)

    def test_main_rewrites_when_the_source_fingerprint_changes(self) -> None:
        with mock.patch.object(version, "datetime") as mocked_datetime:
            mocked_datetime.now.return_value = datetime(2026, 7, 15, 12, 30, 45, tzinfo=timezone.utc)
            version.main()
            first = self.output.read_text()
            self.sources[0].write_text("<html>changed")
            mocked_datetime.now.return_value = datetime(2026, 7, 15, 12, 31, 0, tzinfo=timezone.utc)
            version.main()

        self.assertNotEqual(self.output.read_text(), first)
        self.assertIn('"built": "20260715-123100 UTC"', self.output.read_text())


if __name__ == "__main__":
    unittest.main()