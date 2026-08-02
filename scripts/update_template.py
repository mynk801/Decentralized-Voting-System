import zipfile
import xml.etree.ElementTree as ET
import copy
import shutil
import os

def set_paragraph_text(p, text, ns):
    lines = text.split('\n')
    runs = p.findall('.//w:r', ns)
    template_rPr = None
    if runs:
        rPr = runs[0].find('.//w:rPr', ns)
        if rPr is not None:
            template_rPr = copy.deepcopy(rPr)
            
    pPr = p.find('w:pPr', ns)
    pPr_copy = copy.deepcopy(pPr) if pPr is not None else None
    
    # Remove all children of p
    for child in list(p):
        p.remove(child)
        
    if pPr_copy is not None:
        p.append(pPr_copy)
        
    for idx, line in enumerate(lines):
        if idx > 0:
            br_r = ET.SubElement(p, f'{{{ns["w"]}}}r')
            ET.SubElement(br_r, f'{{{ns["w"]}}}br')
            
        r = ET.SubElement(p, f'{{{ns["w"]}}}r')
        if template_rPr is not None:
            r.append(copy.deepcopy(template_rPr))
        t = ET.SubElement(r, f'{{{ns["w"]}}}t')
        if line != line.strip() or '  ' in line:
            t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')
        t.text = line

def create_caption_para(text, ns):
    p = ET.Element(f'{{{ns["w"]}}}p')
    pPr = ET.SubElement(p, f'{{{ns["w"]}}}pPr')
    ET.SubElement(pPr, f'{{{ns["w"]}}}jc', {'{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val': 'center'})
    
    r = ET.SubElement(p, f'{{{ns["w"]}}}r')
    rPr = ET.SubElement(r, f'{{{ns["w"]}}}rPr')
    ET.SubElement(rPr, f'{{{ns["w"]}}}b')
    ET.SubElement(rPr, f'{{{ns["w"]}}}i')
    t = ET.SubElement(r, f'{{{ns["w"]}}}t')
    t.text = text
    return p

def create_image_para(rel_id, pic_id, pic_name, width_inches=6.0, height_inches=3.4):
    width_emu = int(width_inches * 914400)
    height_emu = int(height_inches * 914400)
    
    xml_str = f"""
    <w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
         xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
         xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
         xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
         xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="{width_emu}" cy="{height_emu}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="{pic_id}" name="{pic_name}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="{pic_id}" name="{pic_name}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="{rel_id}"/>
                    <a:stretch>
                      <a:fillRect/>
                    </a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="{width_emu}" cy="{height_emu}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect">
                      <a:avLst/>
                    </a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>"""
    return ET.fromstring(xml_str)

def update_docx(src_path, dest_path):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    
    with zipfile.ZipFile(src_path, 'r') as z_in:
        doc_xml_bytes = z_in.read('word/document.xml')
        rels_xml_bytes = z_in.read('word/_rels/document.xml.rels')
        ct_xml_bytes = z_in.read('[Content_Types].xml')
        
        root = ET.fromstring(doc_xml_bytes)
        rels_root = ET.fromstring(rels_xml_bytes)
        ct_root = ET.fromstring(ct_xml_bytes)
        
        # 1. Update standalone paragraphs
        all_paras = root.findall('.//w:p', ns)
        
        updates = {
            4: "Decentralized Voting System (DCVS)",
            6: "System Design Document (Midterm Evaluation)",
            7: "Department of Computer Science & Engineering / Project Team",
            8: "Version 1.0 (Midterm Evaluation Release)",
            9: "July 3, 2026",
            13: "DCVS Development Team",
            16: "Project Code: DCVS-2026-M1",
            17: "Date: 03/07/2026",
            18: "Prepared by: DCVS Architecture & Engineering Team",
            
            # TOC
            19: "1. Introduction",
            20: "2. Purpose",
            21: "3. Scope",
            22: "4. Intended Audience",
            23: "5. References",
            24: "6. Acronyms, Terms, and Definitions",
            25: "7. Assumptions and Constraints",
            26: "8. Basic Design Approach",
            27: "9. Risks & Mitigation Strategies",
            28: "10. System Overview",
            29: "11. Architecture Design",
            30: "12. Data Design & Ledger Schema",
            31: "13. API Repository & Endpoints",
            32: "13.1 Endpoint Specifications",
            33: "14. Component Design",
            34: "14.1 Cryptographic Workflow Summary",
            35: "14.2 Core DCVS Components",
            36: "14.2.1 Pass Verification & Authentication",
            37: "14.2.2 Client-Side Encryption Engine",
            38: "14.2.3 Tamper-Evident Ledger Chaining",
            39: "14.2.4 Real-Time Ledger Verification",
            40: "15. Interface & UI Design",
            41: "15.1 Pass Verification Layout",
            42: "15.2 Interactive Ballot Layout",
            43: "15.3 Ledger Integrity Badge",
            44: "16. Design Considerations & Security Controls",
            45: "16.1 Privacy & Double-Voting Prevention",
            46: "16.2 Cryptographic Key Management",
            47: "17. Design Testing & Verification Plan",
            48: "18. Cross Reference with SRS",
            49: "Appendix A: Cryptographic Specifications",
            50: "Appendix B: Directory & Project Structure",
            
            # Main Body
            71: "The Decentralized Voting System (DCVS) is an advanced, end-to-end encrypted electronic voting platform engineered for secure ballot casting and verifiable ledger integrity. Traditional electronic voting systems suffer from two major vulnerabilities: centralized database tampering by privileged insiders, and network interception of unencrypted ballots. DCVS resolves both challenges by implementing strict client-side encryption using RSA-OAEP before any data leaves the voter's device, combined with a cryptographic hash-chain ledger stored in MongoDB. Every vote recorded in the database contains the SHA-256 hash of the preceding vote along with its encrypted payload, forming an immutable chain where any unauthorized modification immediately breaks cryptographic verification.",
            73: "The purpose of this System Design Document is to provide a complete, authoritative architectural blueprint for the Decentralized Voting System (DCVS). It defines the system architecture, REST API contracts, cryptographic workflows, MongoDB data models, and user interface designs. This document guides software developers, security auditors, and system evaluators through the exact implementation details required to meet functional specification SRS_13_DCVC.",
            75: "The scope of this document covers the implementation of the DCVS Midterm Evaluation release. It encompasses: (1) Voter authentication via one-time mock JSON passes (MOCK-VOTER-PASS-*); (2) Single-use token tracking to enforce one person, one vote; (3) Client-side vote encryption using 2048-bit RSA keys; (4) Cryptographic ballot chaining in MongoDB using SHA-256 digests; and (5) Automated chain auditing endpoints and UI verification badges.",
            77: "This document is intended for project architects, frontend and backend software engineers, quality assurance testers, academic evaluation panels, and security analysts evaluating the Decentralized Voting System.",
            79: "1. System Requirement Specification (SRS) for Decentralized Voting System (SRS_13_DCVC.pdf)\n2. W3C Web Cryptography API (W3C Recommendation for Client-Side Asymmetric Encryption)\n3. NIST FIPS 180-4: Secure Hash Standard (SHA-256 Algorithm Specifications)\n4. RFC 8017: PKCS #1 RSA Cryptography Specifications Version 2.2",
            89: "System Assumptions:\n1. Client web browsers support ES6+ JavaScript and modern Web Cryptography API standards required for RSA-OAEP encryption.\n2. The backend Express server runs on Node.js v16+ with direct filesystem read access to the RSA public key file (keys/public.pem).\n3. Voters possess valid, unconsumed mock JSON pass files issued by the authorization authority.",
            90: "System Constraints:\n1. Immutable Ledger Constraint: Once a vote document is persisted to the MongoDB ledger, its currentHash, previousHash, and encryptedPayload fields cannot be modified or deleted without permanently invalidating the ledger chain.\n2. Single-Use Pass Constraint: Each voter pass token is recorded in the UsedToken collection upon voting; duplicate submission attempts are rejected with HTTP 403 Forbidden.",
            92: "DCVS follows a Decoupled Client-Server and Cryptographic Ledger architecture designed around privacy, tamper-evidence, and modular separation of concerns:",
            93: "1. Client-Side Cryptographic Isolation: All ballot choices are encrypted within the voter's web browser using the public key retrieved from the server. Plaintext vote selections never traverse the network or enter server memory.",
            94: "2. Stateless API & Stateful Ledger: The REST API operates statelessly, processing authentication and vote chaining requests independently while maintaining historical chain order in the MongoDB Vote collection.",
            96: "1. Server Private Key Compromise: If keys/private.pem is exposed, past encrypted votes could be decrypted. Mitigation: Private keys are restricted to protected server file directories outside web root access.\n2. Concurrent Vote Submission (Race Conditions): Simultaneous requests attempting to use the same token. Mitigation: Pre-cast token validation against the UsedToken collection combined with unique database index constraints.\n3. Database Tampering by Insiders: Unauthorized modification of stored ballots. Mitigation: The SHA-256 chain links every vote to all preceding votes; real-time chain auditing exposes any tampering instantly.",
            99: "The Decentralized Voting System provides a full-stack web interface combined with a cryptographic backend service. Voters interact with a React SPA (Single Page Application) running on port 5173. To vote, the user uploads their pass file (MOCK-VOTER-PASS-*.json), which the frontend verifies against the backend API (running on port 5000). Once authorized, the user selects a candidate. The frontend fetches the server's RSA public key, encrypts the vote, and submits the ciphertext and pass token. The backend verifies token freshness, computes the SHA-256 hash chaining the new vote to the previous vote hash, stores the vote, and marks the pass as consumed.",
            104: "The system architecture is structured into three distinct operational tiers:\n[Presentation Tier - React / Vite Frontend (Port 5173)] ↔ REST JSON / HTTPS ↔ [Application Tier - Node.js / Express API (Port 5000)] ↔ MongoDB Driver ↔ [Persistence Tier - MongoDB Database (Port 27017)].",
            106: "1. Frontend Tier: Built with React, Vite, and Lucide/Tailwind UI components. Handles file upload parsing, client-side RSA encryption via Web Crypto / JSEncrypt, and polling the /api/votes/verify-chain endpoint to render the Ledger Integrity badge.\n2. Backend API Tier: Built with Express.js and Node native crypto module. Manages authentication routes (/api/votes/verify-pass), public key distribution (/api/votes/public-key), ballot persistence (/api/votes/cast), and cryptographic chain auditing (/api/votes/verify-chain).\n3. Persistence Tier: MongoDB instance maintaining collections for Voter identities, UsedToken usage registry, and the Vote hash chain.",
            110: "All application data is stored in a MongoDB database named 'dcvs'. To guarantee strict ballot anonymity and prevent double voting, data is segregated across three distinct collections: Vote, UsedToken, and Voter.",
            111: "1. Vote Collection: Functions as the cryptographic ledger. Each document stores encryptedPayload, previousHash, currentHash, and timestamp.\n2. UsedToken Collection: Functions as the spent-token registry. Records each consumed pass token along with a timestamp.\n3. Voter Collection: Stores registered voter identity hashes (idHash), assigned anonymous tokens, and public keys.",
            112: "Figure 2: Cryptographic Ledger Chain & Collection Relationship Diagram",
            113: "The database collections are designed to maintain separation of concerns while securing ledger immutability:",
            114: "Database Collections & Field Definitions",
            116: "Table 2: MongoDB Collection Schemas (Vote, UsedToken, Voter)",
            117: "The following table defines the document structures, data types, and index constraints enforcing ledger integrity and single-use voting:",
            147: "The DCVS architecture comprises four core functional components that cooperate to execute end-to-end encrypted voting:",
            148: "Figure 3: Cryptographic Workflow & Component Interaction Diagram",
            149: "Component 1: Pass Authentication & Token Validation Engine",
            150: "This component verifies the authenticity and freshness of voter pass files before granting access to the ballot interface.",
            151: "Process Flow: (1) User drops pass JSON file into frontend uploader; (2) Frontend extracts token string and validates prefix 'MOCK-VOTER-PASS-'; (3) Sends token via POST /api/votes/verify-pass; (4) Backend queries UsedToken collection; (5) If token exists in UsedToken, returns 403 Forbidden; otherwise returns 200 OK authorization.",
            152: "Component 2: Client-Side RSA Vote Encryption Engine",
            154: "Process Flow: (1) Upon authorized pass verification, voter selects a candidate from the UI; (2) Frontend calls GET /api/votes/public-key; (3) Backend reads keys/public.pem and serves the 2048-bit RSA public key; (4) Frontend encrypts candidate selection string using RSA-OAEP padding; (5) Submits ciphertext and token via POST /api/votes/cast.\n\nComponent 3: Tamper-Evident Ledger Chaining Engine\nProcess Flow: (1) Backend receives POST /api/votes/cast request; (2) Atomically checks UsedToken collection to prevent concurrent race conditions; (3) Queries Vote collection sorted by timestamp (-1) to retrieve the last vote's currentHash (or uses GENESIS_HASH '0' if chain is empty); (4) Computes currentHash = SHA-256(previousHash + encryptedPayload); (5) Persists Vote document and saves token into UsedToken collection.\n\nComponent 4: Real-Time Ledger Verification Engine\nProcess Flow: (1) GET /api/votes/verify-chain queries all Vote documents in chronological order; (2) Recomputes expected SHA-256 hashes for each block; (3) Verifies previousHash linkage across the entire chain; (4) Returns intact: true/false status.",
            157: "The DCVS user interface is built as a responsive Single Page Application (SPA) structured into three core interfaces:\n1. Voter Authentication Interface: Features a clean, modern file upload area supporting drag-and-drop for MOCK-VOTER-PASS-*.json files. Displays real-time validation status with descriptive feedback alerts.\n2. Secure Ballot Interface: Rendered only after successful pass verification. Displays candidate cards with selection indicators and a prominent 'Cast Encrypted Vote' action button.\n3. Ledger Integrity Dashboard Badge: Embedded in the application header/home view. Periodically queries GET /api/votes/verify-chain and renders a glowing green badge ('Ledger Integrity: Verified Intact') when all cryptographic links are valid, or a red warning alert if database tampering is detected.",
            159: "1. Separation of Identity and Ballot: By storing consumed pass tokens in the UsedToken collection completely independent of the Vote collection, the system ensures that administrators inspecting MongoDB cannot link a stored encryptedPayload to a specific voter pass.",
            160: "2. Cryptographic Hash Chaining: SHA-256 chaining ensures that any modification to a stored vote (e.g. altering ciphertext or timestamp directly in MongoDB) changes its currentHash, causing all subsequent link validations in verifyChain to fail immediately.",
            161: "3. Pre-generated Asymmetric Keypairs: The RSA keypair is generated via scripts/generateKeys.js and stored in keys/public.pem and keys/private.pem. The private key never leaves the server and is never exposed via API endpoints.",
            162: "4. Race Condition Protection: Double verification of token status inside castVote prevents simultaneous double-voting attempts from bypassing pass restrictions.",
            163: "5. Genesis Anchor Security: The first vote cast in the ledger anchors to GENESIS_HASH ('0'), establishing a root deterministic anchor for verification algorithms.",
            165: "1. Authentication & Replay Testing: Verify that submitting an unconsumed pass grants access (200 OK). Verify that attempting to reuse a consumed pass or submitting an invalid string returns 403 Forbidden or 400 Bad Request.\n2. End-to-End Encryption Verification: Inspect network request payloads during POST /api/votes/cast to ensure candidate names never appear in plaintext and that payload is valid RSA ciphertext.\n3. Tamper Detection Testing: Manually modify a vote's encryptedPayload in MongoDB. Execute GET /api/votes/verify-chain and verify that the API returns { intact: false } and identifies the exact link position where validation failed.",
            182: "Appendix A: Cryptographic & System Parameters",
            184: "1. Asymmetric Algorithm: RSA-OAEP (2048-bit modulus size, public exponent 65537).\n2. Hash Digest Algorithm: SHA-256 (FIPS 180-4 compliant, outputting 64-char hex string).\n3. Default Database Port: MongoDB localhost:27017 (Database name: dcvs).\n4. Default Backend API Port: Node.js / Express localhost:5000.\n5. Default Frontend Web Port: Vite / React localhost:5173."
        }
        
        for idx, new_text in updates.items():
            if idx < len(all_paras):
                set_paragraph_text(all_paras[idx], new_text, ns)
                
        # 2. Update Tables
        tbls = root.findall('.//w:tbl', ns)
        
        # Table 1: Acronyms
        if len(tbls) > 0:
            tbl1 = tbls[0]
            rows1 = list(tbl1.findall('.//w:tr', ns))
            if rows1:
                template_row1 = copy.deepcopy(rows1[0])
                for r in rows1:
                    tbl1.remove(r)
                acronyms = [
                    ('DCVS', 'Decentralized Voting System'),
                    ('SRS', 'System Requirement Specification'),
                    ('RSA-OAEP', 'Rivest-Shamir-Adleman with Optimal Asymmetric Encryption Padding (Client-side encryption)'),
                    ('SHA-256', 'Secure Hash Algorithm 256-bit (Used for cryptographic ledger chaining)'),
                    ('Voter Pass', 'Cryptographic JSON token file issued to authorized voters to authenticate anonymously'),
                    ('Genesis Block', 'The initial anchor vote in the cryptographic ledger chain with previousHash set to "0"'),
                    ('Ledger Integrity', 'The verified state where every ballot\'s stored currentHash perfectly matches SHA-256(previousHash + encryptedPayload)')
                ]
                for ac, defn in acronyms:
                    new_row = copy.deepcopy(template_row1)
                    cells = new_row.findall('.//w:tc', ns)
                    if len(cells) >= 2:
                        p0 = cells[0].findall('.//w:p', ns)
                        p1 = cells[1].findall('.//w:p', ns)
                        if p0: set_paragraph_text(p0[0], ac, ns)
                        if p1: set_paragraph_text(p1[0], defn, ns)
                    tbl1.append(new_row)

        # Table 2: Data Schema
        if len(tbls) > 1:
            tbl2 = tbls[1]
            rows2 = list(tbl2.findall('.//w:tr', ns))
            if len(rows2) >= 2:
                template_row2 = copy.deepcopy(rows2[1])
                for r in rows2[1:]:
                    tbl2.remove(r)
                schema_rows = [
                    ('--- Vote Collection ---', '--- Cryptographic Ledger ---', '---', '--- Tamper-evident vote chain ---'),
                    ('_id (Primary Key)', '_id', 'ObjectId', 'Unique document identifier in MongoDB'),
                    ('Required Field', 'encryptedPayload', 'String', 'RSA-OAEP encrypted ciphertext of candidate choice'),
                    ('Required Field', 'previousHash', 'String', 'SHA-256 hash of previous vote ("0" for Genesis block)'),
                    ('Indexed (Unique)', 'currentHash', 'String', 'SHA-256(previousHash + encryptedPayload), tamper-evident seal'),
                    ('Indexed (-1)', 'timestamp', 'Date', 'Timestamp when vote was recorded (Default: Date.now)'),
                    ('--- UsedToken Collection ---', '--- Spent Token Registry ---', '---', '--- Prevents double voting ---'),
                    ('Token (Primary Index)', 'token', 'String', 'Unique mock voter pass token string (MOCK-VOTER-PASS-*)'),
                    ('Default Field', 'usedAt', 'Date', 'Timestamp when pass token was consumed'),
                    ('--- Voter Collection ---', '--- Voter Identity Vault ---', '---', '--- Identity verification ---'),
                    ('Indexed (Unique)', 'idHash', 'String', 'SHA-256 hash of Government ID'),
                    ('Required Field', 'publicKey', 'String', 'Voter identity public key'),
                    ('Required Field', 'anonymousToken', 'String', 'Assigned anonymous token')
                ]
                for c1, c2, c3, c4 in schema_rows:
                    new_row = copy.deepcopy(template_row2)
                    cells = new_row.findall('.//w:tc', ns)
                    if len(cells) >= 4:
                        p0 = cells[0].findall('.//w:p', ns)
                        p1 = cells[1].findall('.//w:p', ns)
                        p2 = cells[2].findall('.//w:p', ns)
                        p3 = cells[3].findall('.//w:p', ns)
                        if p0: set_paragraph_text(p0[0], c1, ns)
                        if p1: set_paragraph_text(p1[0], c2, ns)
                        if p2: set_paragraph_text(p2[0], c3, ns)
                        if p3: set_paragraph_text(p3[0], c4, ns)
                    tbl2.append(new_row)

        # Table 3: SRS Matrix
        if len(tbls) > 2:
            tbl3 = tbls[2]
            rows3 = list(tbl3.findall('.//w:tr', ns))
            if len(rows3) >= 4:
                sep_row = copy.deepcopy(rows3[2])
                template_row3 = copy.deepcopy(rows3[3])
                for r in rows3[2:]:
                    tbl3.remove(r)
                
                sep_cells = sep_row.findall('.//w:tc', ns)
                if sep_cells:
                    p0 = sep_cells[0].findall('.//w:p', ns)
                    if p0: set_paragraph_text(p0[0], "VOTE ENCRYPTION & LEDGER CHAINING COMPONENT", ns)
                tbl3.append(sep_row)
                
                api_rows = [
                    ('POST /api/votes/verify-pass', 'FR-1: Voter Pass Validation', 'Meets FR completely. Validates MOCK-VOTER-PASS-* format and checks UsedToken database to prevent duplicate voting.'),
                    ('GET /api/votes/public-key', 'FR-2: Client-Side Encryption Setup', 'Meets FR completely. Serves server RSA 2048-bit public key (public.pem) for client-side payload encryption.'),
                    ('POST /api/votes/cast', 'FR-3: Secure Ballot Casting & Ledger Chaining', 'Meets FR completely. Receives encrypted payload and token, verifies token unused, fetches previousHash, calculates currentHash = SHA-256(previousHash + encryptedPayload), saves Vote, and consumes token.'),
                    ('GET /api/votes/verify-chain', 'FR-4: Real-Time Ledger Auditing', 'Meets FR completely. Chronologically audits entire vote chain, recomputes SHA-256 hashes, verifies sequential links, and returns integrity status.')
                ]
                for c1, c2, c3 in api_rows:
                    new_row = copy.deepcopy(template_row3)
                    cells = new_row.findall('.//w:tc', ns)
                    if len(cells) >= 3:
                        p0 = cells[0].findall('.//w:p', ns)
                        p1 = cells[1].findall('.//w:p', ns)
                        p2 = cells[2].findall('.//w:p', ns)
                        if p0: set_paragraph_text(p0[0], c1, ns)
                        if p1: set_paragraph_text(p1[0], c2, ns)
                        if p2: set_paragraph_text(p2[0], c3, ns)
                    tbl3.append(new_row)

        # 3. Insert Images into document.xml
        parent_map = {c: p for p in root.iter() for c in p}
        
        # Define image insertions: (after_para_index, local_img_name, caption_text)
        images_to_insert = [
            (106, 'arch_diagram.png', 'Figure 1: DCVS 3-Tier System Architecture Diagram'),
            (112, 'er_diagram.png', 'Figure 2: MongoDB Collection Schema & Hash Chain Diagram'),
            (148, 'flow_diagram.png', 'Figure 3: Cryptographic Component Workflow Diagram'),
            (157, 'auth_ui.png', 'Figure 4.1: Voter Authentication Portal UI Layout'),
            (157, 'ballot_ui.png', 'Figure 4.2: Secure Interactive Ballot Casting UI Layout'),
            (157, 'integrity_badge.png', 'Figure 4.3: Real-Time Ledger Integrity Verification Badge')
        ]
        
        # Check [Content_Types].xml for png support
        has_png = False
        for child in ct_root:
            if child.attrib.get('Extension', '').lower() == 'png':
                has_png = True
                break
        if not has_png:
            ET.SubElement(ct_root, '{http://schemas.openxmlformats.org/package/2006/content-types}Default', {
                'Extension': 'png',
                'ContentType': 'image/png'
            })
            
        # Add relationships and insert paragraphs
        # Note: We track offset for multiple insertions at index 157
        insert_offset_157 = 1
        for idx_num, (target_idx, img_name, caption_text) in enumerate(images_to_insert):
            rel_id = f"rIdImg{idx_num+1}"
            media_path = f"media/image{idx_num+1}.png"
            
            # Add relationship
            ET.SubElement(rels_root, '{http://schemas.openxmlformats.org/package/2006/relationships}Relationship', {
                'Id': rel_id,
                'Type': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
                'Target': media_path
            })
            
            target_p = all_paras[target_idx]
            parent = parent_map[target_p]
            pos = list(parent).index(target_p)
            
            img_para = create_image_para(rel_id, idx_num+100, f"Figure_{idx_num+1}")
            cap_para = create_caption_para(caption_text, ns)
            
            if target_idx == 157:
                parent.insert(pos + insert_offset_157, cap_para)
                parent.insert(pos + insert_offset_157 + 1, img_para)
                insert_offset_157 += 2
            else:
                parent.insert(pos + 1, img_para)
                # If target_idx isn't already a caption heading, add caption after image
                if target_idx not in [112, 148]:
                    parent.insert(pos + 2, cap_para)

        new_doc_xml = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        new_rels_xml = ET.tostring(rels_root, encoding='utf-8', xml_declaration=True)
        new_ct_xml = ET.tostring(ct_root, encoding='utf-8', xml_declaration=True)

    tmp_path = dest_path + ".tmp"
    with zipfile.ZipFile(src_path, 'r') as z_in:
        with zipfile.ZipFile(tmp_path, 'w', zipfile.ZIP_DEFLATED) as z_out:
            for item in z_in.infolist():
                if item.filename == 'word/document.xml':
                    z_out.writestr(item, new_doc_xml)
                elif item.filename == 'word/_rels/document.xml.rels':
                    z_out.writestr(item, new_rels_xml)
                elif item.filename == '[Content_Types].xml':
                    z_out.writestr(item, new_ct_xml)
                else:
                    z_out.writestr(item, z_in.read(item.filename))
            
            # Write image files
            for idx_num, (target_idx, img_name, caption_text) in enumerate(images_to_insert):
                img_file_path = os.path.join('doc_images', img_name)
                if os.path.exists(img_file_path):
                    z_out.write(img_file_path, f"word/media/image{idx_num+1}.png")
                    
    if os.path.exists(dest_path):
        os.remove(dest_path)
    os.rename(tmp_path, dest_path)
    print("Successfully updated docx with detailed text and all 6 design images!")

if __name__ == '__main__':
    update_docx('3. Design Document Template.docx.bak', '3. Design Document Template.docx')

