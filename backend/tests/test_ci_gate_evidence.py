"""Temporary failure used once to demonstrate the protected CI merge gate."""


def test_required_check_blocks_merge() -> None:
    assert False, "deliberate CI gate demonstration; remove in the next commit"
